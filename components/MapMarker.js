import React from 'react';
import {
  StyleSheet,
  Dimensions,
} from 'react-native';
import PropTypes from 'prop-types';
import {
  MapView,
} from 'expo';

const { width, height } = Dimensions.get('window');

class MapMarker extends React.Component {
  constructor(props) {
    super(props);

    this.initialRegion = {
      latitudeDelta: 0.0122,
      longitudeDelta: width / height * 0.0122,
    };

    this.state = {
      isMapReady: false,
    };
  }

  onMapReady = () => {
    this.setState({ isMapReady: true });
  };

  renderMapMarker() {
    const { isMapReady } = this.state;
    if (!isMapReady) {
      return null;
    }
    const { coordinate } = this.props;
    return (
      <MapView.Marker
        coordinate={coordinate}
      />
    );
  }

  render() {
    const { coordinate, style, ...rest } = this.props;
    return (
      <MapView
        style={[styles.map, style]}
        provider="google"
        initialRegion={{
          ...this.initialRegion,
          latitude: coordinate.latitude,
          longitude: coordinate.longitude,
        }}
        loadingEnabled
        customMapStyle={mapStyle}
        onMapReady={this.onMapReady}
        {...rest}
      >
        {this.renderMapMarker()}
      </MapView>
    );
  }
}

const mapStyle = require('../assets/styles/mapStyle');

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
});

export default MapMarker;

MapMarker.propTypes = {
  coordinate: PropTypes.shape({
    latitude: PropTypes.number,
    longitude: PropTypes.number,
  }).isRequired,
};
