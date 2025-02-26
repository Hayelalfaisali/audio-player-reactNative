import React from 'react';
import { View, StyleSheet } from 'react-native';
import AudioPlayer from '../components/AudioPlayer';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <AudioPlayer
        timestamp="6:41 p.m."
        imageUrl="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E5DDD5',
    padding: 16,
  },
});