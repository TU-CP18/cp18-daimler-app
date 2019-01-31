import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Alert,
  TextInput,
  ScrollView,
  NativeModules,
  LayoutAnimation,
} from 'react-native';
import { observer, inject } from 'mobx-react';
import { reaction } from 'mobx';
import { Entypo } from '@expo/vector-icons';
import Rating from '../../components/Rating';
import Button from '../../components/Button';

const { UIManager } = NativeModules;

UIManager.setLayoutAnimationEnabledExperimental &&
  UIManager.setLayoutAnimationEnabledExperimental(true);

@inject('issues', 'alert')
@observer
class InteriorCheckScreen extends React.Component {
  static navigationOptions = ({ navigation }) => {
    return {
      title: 'Interior Check',
      headerStyle: {
        backgroundColor: '#000000',
        elevation: 0,
        borderBottomWidth: 0,
      },
      headerTintColor: '#ffffff',
      headerRight: (
        <Entypo
          onPress={() => alert('This is a button!')}
          name="chat"
          size={32}
          color="#ffffff"
          style={{ marginRight: 16, marginTop: 6 }}
        />
      ),
    };
  };

  constructor(props) {
    super(props);

    this.state = {
      rating: -1,
      issueFormVisible: false,
      issueDesc: '',
    };

    reaction(
      () => props.issues.insertLoading,
      loading => {
        if (!loading && !props.issues.insertError) {
          // when inserting is done and there has been no error
          // switch back to the issue list view
          LayoutAnimation.easeInEaseOut();
          this.setState({
            issueFormVisible: false,
            issueDesc: '',
          });
        }
      },
    );
  }

  onPressStartRide = () => {
    const {
      navigation,
      alert,
    } = this.props;
    const {
      rating,
    } = this.state;

    if (rating === -1) {
      alert.show(
        'Rating missing',
        'Please rate the cleanliness of the interior before you proceed',
      );
      return;
    }

    Alert.alert(
      'Confirmation Request',
      'Confirm that you checked the operional readiness of the car '
      + 'accordingly and that you are prepared to drive manually if required.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => navigation.navigate('Ride') },
      ],
      { cancelable: true },
    );
  }

  showIssueForm = () => {
    LayoutAnimation.easeInEaseOut();
    this.setState({
      issueFormVisible: true,
    });
  }

  hideIssueForm = () => {
    LayoutAnimation.easeInEaseOut();
    this.setState({
      issueFormVisible: false,
    });
  }

  createIssue = () => {
    const {
      issues,
      alert,
    } = this.props;
    const {
      issueDesc,
    } = this.state;

    if (!issueDesc || issueDesc.length === 0) {
      alert.show('Description missing', 'Please provide a description for the issue');
      return;
    }

    issues.addIssue(
      0,
      0,
      'interior/general',
      issueDesc,
    );
  }

  render() {
    const {
      issues,
    } = this.props;
    const {
      rating,
      issueFormVisible,
      issueDesc,
    } = this.state;

    const issueList = issues.issues.slice().filter(issue => {
      return issue.part.startsWith('interior');
    });

    return (
      <View style={s.caroussel}>
        <View style={[s.main, { marginLeft: issueFormVisible ? '-100%' : 0 }]}>
          <View style={s.content}>
            <Text style={s.guideText}>
              Before you can start the ride, please track new issues and confirm that the car is operational.
            </Text>

            <Text style={s.guideText}>
              Existing Issues
            </Text>

            {issueList.length === 0 && (
              <Text style={{ color: '#ffffff', fontSize: 16, marginBottom: 20, }}>
                There are currently no issue tracked
              </Text>
            ) || (
              <ScrollView>
                {issueList.map((issue, index) => {
                  return (
                    <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14}}>
                      <View
                        style={{
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: '#ffffff',
                        }}
                      >
                        <Text textAlign="center">
                          {index + 1}
                        </Text>
                      </View>
                      <Text
                        style={{
                          color: '#ffffff',
                          marginLeft: 20,
                          fontSize: 16,
                          marginRight: 20,
                          // flexWrap: 'wrap',
                        }}
                        numberOfLines={3}
                      >
                        {issue.description}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            )}

            <Text style={[s.guideText, s.guideTextCleanliness]}>
              Please also rate how clean the interior of the car is
            </Text>
            <Rating
              rating={rating}
              onRate={rating => this.setState({ rating: rating })}
              style={s.rating}
            />
          </View>

          <View style={s.buttonGroup}>
            <Button
              onPress={this.showIssueForm}
              title="Add Issue"
              iconLeft="Entypo/plus"
              containerStyle={s.addIssueButtonContainer}
              textStyle={s.addIssueText}
            />
            <Button
              onPress={this.onPressStartRide}
              title="Start Ride"
              wrapperStyle={s.confirmButtonWrapper}
              containerStyle={s.confirmButtonContainer}
            />
          </View>
        </View>

        <View style={[s.form, { marginRight: issueFormVisible ? 0 : '-100%' }]}>
          <View style={s.formContent}>
            <Text style={{ alignSelf: 'center', color: '#ffffff', fontSize: 20, marginBottom: 20,}}>
              Add new Issue
            </Text>
            {/* <Text style={{ color: '#ffffff', marginBottom: 20, fontSize: 16, }}>
              Please marke the position of the discovered issue on the image and
              enter a short description.
            </Text>
            <Text style={{ color: '#ffffff', marginBottom: 10, }}>
              Selected Part: {issuePosition.part || '-'}
            </Text> */}
            <TextInput
              style={s.descInput}
              underlineColorAndroid="transparent"
              placeholder="Type short description here ..."
              value={issueDesc}
              onChangeText={text => this.setState({ issueDesc: text })}
              placeholderTextColor="#ffffff"
            />
          </View>
          <View style={s.buttonGroup}>
            <Button
              onPress={this.hideIssueForm}
              title="Cancel"
              containerStyle={s.addIssueButtonContainer}
              textStyle={s.addIssueText}
            />
            <Button
              onPress={this.createIssue}
              title="Add Issue"
              wrapperStyle={s.confirmButtonWrapper}
              containerStyle={s.confirmButtonContainer}
            />
          </View>
        </View>
      </View>
    );
  }
}

const s = StyleSheet.create({
  caroussel: {
    flexDirection: 'row',
    flex: 1,
    width: '100%',
  },
  main: {
    flex: 1,
    backgroundColor: '#000000',
  },
  form: {
    width: '100%',
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  guideText: {
    color: '#ffffff',
    marginBottom: 12,
    fontSize: 16,
  },
  guideTextCleanliness: {
    paddingBottom: 4,
  },
  rating: {
    paddingLeft: 10,
    marginBottom: 20,
  },
  formContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  descInput: {
    borderWidth: 1,
    borderColor: '#ffffff',
    padding: 10,
    borderRadius: 4,
    height: 38,
    color: '#ffffff',
  },

  buttonGroup: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  addIssueButtonContainer: {
    borderWidth: 0,
  },
  addIssueText: {
    fontSize: 18,
  },

  confirmButtonWrapper: {
    flex: 1,
    marginLeft: 20,
  },
  confirmButtonContainer: {
    paddingTop: 12,
    paddingBottom: 12,
    marginBottom: 20,
  },
});

export default InteriorCheckScreen;
