import React from 'react';
import PropTypes from 'prop-types';
import {
  StyleSheet,
  View,
  Dimensions,
  Alert,
  TouchableOpacity,
  Text,
} from 'react-native';
import {
  MapView,
  Location,
  Permissions,
  IntentLauncherAndroid,
  Constants,
} from 'expo';
import { Ionicons } from '@expo/vector-icons';
import geolib from 'geolib';
import MapboxClient from 'mapbox';
import lib from '../helpers/lib';
import Button from './Button';

const { width, height } = Dimensions.get('window');

class MapRoute extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      coordinates: [],
      steps: [],
      focusedLocation: {
        latitude: props.latitude,
        longitude: props.longitude,
        latitudeDelta: 0.0122,
        longitudeDelta: width / height * 0.0122,
      },
      destinationReached: false,
      isMapReady: false,
      isNavigation: false,
    };

    this.apikey = Constants.manifest.extra.mapbox.apiKey;
  }

  async componentDidMount() {
    const {
      showDirections,
      latitude,
      longitude,
      initialFocus,
    } = this.props;

    // ask the user for location permission
    const { locationServicesEnabled } = await Location.getProviderStatusAsync();
    if (!locationServicesEnabled) {
      IntentLauncherAndroid.startActivityAsync(
        IntentLauncherAndroid.ACTION_LOCATION_SOURCE_SETTINGS,
      );
      return;
    }
    if (await !lib.isPermissionGranted(Permissions.LOCATION)) {
      Alert.alert('Permission', 'You need to enable location services');
      return;
    }

    // get the current location of the user
    const currentLocation = await lib.getLocation();
    const destinationLocation = {
      latitude,
      longitude,
    };

    if (initialFocus === 'gps') {
      this.focusOnCoords(currentLocation);
    } else {
      this.focusOnCoords(destinationLocation);
    }

    // retrieve a direction between these two points
    if (showDirections) {
      const coords = await this.getDirections(currentLocation, destinationLocation);
      this.map.fitToCoordinates(coords, {
        edgePadding: {
          top: 60,
          right: 25,
          bottom: 80,
          left: 25,
        },
        animated: true,
      });
      // monitor the current position of the user
      this.watchid = await Location.watchPositionAsync({
        enableHighAccuracy: true,
        distanceInterval: 1,
      }, this.checkUserLocation);
    }
  }

  componentDidUpdate(prevProps) {
    const { isNavigation } = this.props;
    if (isNavigation && isNavigation !== prevProps.isNavigation) {
      this.startNavigation();
    }
  }

  componentWillUnmount() {
    if (this.watchid) {
      this.watchid.remove();
    }
  }

  focusOnCoords = coords => {
    const { focusedLocation } = this.state;
    const region = {
      ...focusedLocation,
      latitude: coords.latitude,
      longitude: coords.longitude,
    };
    // initalize map at current position
    this.map.animateToRegion(region);
    this.setState({
      focusedLocation: region,
    });
  };

  /**
   * retrieves the coordinates of a route
   * route: safety drivers position to the interception point
   * @param startLoc
   * @param destinationLoc
   * @returns {Promise<*>}
   */
  getDirections = async (startLoc, destinationLoc) => {
    const client = new MapboxClient(this.apikey);
    const res = await client.getDirections(
      [
        startLoc,
        destinationLoc,
      ],
      { profile: 'driving', geometry: 'polyline6' },
    );
    const coordinates = res.entity.routes[0].geometry.coordinates.map(point => {
      return {
        latitude: point[1],
        longitude: point[0],
      };
    });
    const steps = res.entity.routes[0].legs[0].steps.map(step => {
      return {
        latitude: step.maneuver.location[1],
        longitude: step.maneuver.location[0],
        bearing: step.maneuver.bearing_after,
        done: false,
      };
    });
    this.setState({
      coordinates: coordinates,
      steps: steps,
    });
    return coordinates;
  };

  checkUserLocation = async location => {
    const { onDestinationReached } = this.props;
    const { coordinates, isNavigation } = this.state;
    const { coords } = location;
    if (isNavigation) {
      // follow the user location
      this.animateToCoordinates(coords);
      // navigate route
      this.animateNavigation(coords);
    }
    const destinationCoords = coordinates[coordinates.length - 1];
    const distance = geolib.getDistance(coords, destinationCoords);
    // show button if user is close to destination so he can confirm arrival
    // remove arrival button in case the user moves away from the destination
    if (distance <= 20) {
      this.setState({ destinationReached: true });
      onDestinationReached();
    }
  };

  animateNavigation = async coords => {
    const { steps } = this.state;
    let manoeuvred = false;
    steps.forEach((step, index) => {
      if (step.done || manoeuvred) {
        // maneuver has already been done
        return;
      }
      const distance = geolib.getDistance(coords, step);
      if (distance <= 5) {
        // user is 5 meters close to intersection point
        this.map.animateToBearing(step.bearing);
        steps[index].done = true;
        manoeuvred = true;
        this.setState({ steps: steps });
      }
    });
  };

  /**
   * animate to specified coordinates on the map
   * @param coords
   */
  animateToCoordinates = async coords => {
    const { latitude, longitude } = coords;
    if (latitude && longitude) {
      this.map.animateToCoordinate({
        latitude: latitude,
        longitude: longitude,
      });
    }
  };

  startNavigation = async () => {
    const { coordinates } = this.state;
    this.setState({ isNavigation: true });
    this.map.fitToCoordinates(coordinates.slice(0, 2));
    this.map.animateToViewingAngle(45);
    const currentLocation = await lib.getLocation();
    this.animateNavigation(currentLocation);
  };

  renderConfirmalButton() {
    const { onArrivalConfirmed, showConfirmationButton } = this.props;
    const { destinationReached } = this.state;

    if (!showConfirmationButton || !destinationReached) {
      return null;
    }

    return (
      <View style={styles.confirmContainer}>
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={onArrivalConfirmed}
        >
          <View style={styles.drawerItem}>
            <Ionicons
              name="ios-checkmark-circle-outline"
              size={30}
              color="#ffffff"
              style={styles.drawerItemIcon}
            />
            <Text style={styles.buttonText}>Confirm Arrival</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  renderNavigationButton() {
    const { showNavigationButton } = this.props;
    const { destinationReached, isNavigation } = this.state;

    if (destinationReached || isNavigation || !showNavigationButton) {
      return null;
    }

    return (
      <View style={styles.confirmContainer}>
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={this.startNavigation}
        >
          <View style={styles.drawerItem}>
            <Ionicons
              name="ios-checkmark-circle-outline"
              size={30}
              color="#ffffff"
              style={styles.drawerItemIcon}
            />
            <Text style={styles.buttonText}>Start Navigation</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  renderRoute() {
    const { isMapReady, coordinates } = this.state;
    if (!isMapReady || coordinates.length === 0) {
      return null;
    }
    return (
      <MapView.Polyline
        coordinates={coordinates}
        strokeWidth={5}
        strokeColor="blue"
      />
    );
  }

  renderMarker() {
    const { isMapReady, coordinates } = this.state;
    if (!isMapReady || coordinates.length === 0) {
      return null;
    }
    return (
      <MapView.Marker
        coordinate={coordinates[coordinates.length - 1]}
      />
    );
  }

  onMapReady = () => {
    this.setState({ isMapReady: true });
  };

  render() {
    const { style } = this.props;
    return (
      <View style={styles.container}>
        <MapView
          provider="google"
          style={[styles.map, style]}
          showsUserLocation
          loadingEnabled
          customMapStyle={mapStyle}
          ref={map => { this.map = map; }}
          onMapReady={this.onMapReady}
        >
          {this.renderRoute()}
          {this.renderMarker()}
        </MapView>
        {this.renderConfirmalButton()}
        {this.renderNavigationButton()}
      </View>
    );
  }
}

const mapStyle = require('../assets/styles/mapStyle');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  map: {
    width: width,
    height: height,
  },
  confirmContainer: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    height: 150,
    width: '100%',
    justifyContent: 'center',
  },
  confirmButton: {
    paddingHorizontal: 30,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    backgroundColor: '#000000',
    borderColor: '#ffffff',
    borderWidth: 1,
    borderRadius: 15,
  },
  drawerItemIcon: {
    marginRight: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 22,
  },
});

MapRoute.propTypes = {
  onArrivalConfirmed: PropTypes.func,
  onDestinationReached: PropTypes.func,
  showDirections: PropTypes.bool,
  showConfirmationButton: PropTypes.bool,
  showNavigationButton: PropTypes.bool,
  isNavigation: PropTypes.bool,
  latitude: PropTypes.number.isRequired,
  longitude: PropTypes.number.isRequired,
  initialFocus: PropTypes.string,
};

MapRoute.defaultProps = {
  onArrivalConfirmed: () => undefined,
  onDestinationReached: () => undefined,
  showDirections: true,
  showConfirmationButton: true,
  showNavigationButton: true,
  isNavigation: false,
  initialFocus: 'gps',
};

export default MapRoute;
