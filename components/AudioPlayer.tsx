import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
  useAnimatedGestureHandler,
  runOnJS,
  withSequence,
} from 'react-native-reanimated';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import { Pause, Play } from 'lucide-react-native';
import { Audio } from 'expo-av';

interface AudioPlayerProps {
  timestamp: string;
  imageUrl?: string;
}

const SPEEDS = [1, 1.5, 2];
const AUDIO_URL = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

const generateWaveform = () => {
  return Array.from({ length: 50 }, () => Math.random() * 0.7 + 0.3);
};

export default function AudioPlayer({ timestamp, imageUrl }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const progress = useSharedValue(0);
  const containerWidth = useSharedValue(0);
  const waveformData = React.useMemo(() => generateWaveform(), []);
  const [playbackProgress, setPlaybackProgress] = useState(0);


  useEffect(() => {
    loadAudio();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  const loadAudio = async () => {
    try {
      console.log('Loading audio...');
      const { sound: audioSound, status } = await Audio.Sound.createAsync(
        { uri: AUDIO_URL },
        { shouldPlay: false },
        onPlaybackStatusUpdate
      );
      setSound(audioSound);
      setIsLoaded(true);

      // Check if sound is actually loading
      console.log('Audio loaded:', status);
    } catch (error) {
      console.error('Error loading audio:', error);
    }
  };


  const onPlaybackStatusUpdate = (status: any) => {
    if (!status.isLoaded) return;

    if (status.isPlaying) {
      const newProgress = status.positionMillis / status.durationMillis;
      if (isFinite(newProgress)) {
        progress.value = withTiming(newProgress, { duration: 100 });

        // Force React to re-render with progress
        runOnJS(setPlaybackProgress)(newProgress);
      }
    }

    if (status.didJustFinish) {
      setIsPlaying(false);
      progress.value = 0;
      progress.value = withSequence(withTiming(0, { duration: 300 }));
      runOnJS(setPlaybackProgress)(0);
    }
  };


  const circleStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: progress.value * (containerWidth.value - 12) }],
    };
  });

  const togglePlay = async () => {
    if (!sound || !isLoaded) {
      console.log('Sound not loaded yet');
      return;
    }

    try {
      const status = await sound.getStatusAsync();
      console.log('Current status:', status);

      if (status.isLoaded) {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          await sound.setRateAsync(SPEEDS[speedIndex], true);
          await sound.playAsync();
          setIsPlaying(true);
        }
      } else {
        console.log('Sound is not loaded correctly');
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
      setIsPlaying(false);
    }
  };


  const toggleSpeed = async () => {
    if (!sound || !isLoaded) return;

    try {
      const newSpeedIndex = (speedIndex + 1) % SPEEDS.length;
      setSpeedIndex(newSpeedIndex);
      if (isPlaying) {
        await sound.setRateAsync(SPEEDS[newSpeedIndex], true);
      }
    } catch (error) {
      console.error('Error changing speed:', error);
    }
  };

  const seekAudio = async (newProgress: number) => {
    if (!sound || !isLoaded) return;

    try {
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        if (status.durationMillis !== undefined) {
          const newPosition = newProgress * status.durationMillis;
          if (isFinite(newPosition)) {
            await sound.setPositionAsync(newPosition);
          }
        }
      }
    } catch (error) {
      console.error('Error seeking audio:', error);
    }
  };

  const onGestureEvent = useAnimatedGestureHandler({
    onStart: (_, ctx: any) => {
      ctx.startX = progress.value;
    },
    onActive: (event, ctx) => {
      const newProgress = ctx.startX + event.translationX / containerWidth.value;
      progress.value = Math.max(0, Math.min(1, newProgress));
    },
    onEnd: () => {
      runOnJS(seekAudio)(progress.value);
    }
  });



  const onLayout = (event: any) => {
    containerWidth.value = event.nativeEvent.layout.width;
  };
  const formatTime = (milliseconds: number) => {
    if (!milliseconds || milliseconds <= 0) return "0:00";

    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };


  return (
    <GestureHandlerRootView>
      <View style={styles.container}>
        <Pressable onPress={togglePlay} style={styles.playButton}>
          {isPlaying ? (
            <Pause size={24} color="#667781" />
          ) : (
            <Play size={24} color="#00A884" fill="#00A884" />
          )}
        </Pressable>

        <View style={styles.progressContainer}>
          <View style={styles.waveformContainer} onLayout={onLayout}>
            <View style={styles.waveform}>
              {waveformData.map((height, index) => (
                <View
                  key={index}
                  style={[
                    styles.waveformBar,
                    {
                      height: `${height * 100}%`,
                      backgroundColor: (index / waveformData.length) <= progress.value
                        ? '#00A884'
                        : '#E7E7E7',

                    }
                  ]}
                />
              ))}
            </View>
            <PanGestureHandler onGestureEvent={onGestureEvent}>
              <Animated.View style={[styles.progressCircle, circleStyle]}>
              </Animated.View>
            </PanGestureHandler>
          </View>
          <Text style={styles.timestamp}>
            {formatTime(progress.value)}
          </Text>

        </View>

        {isPlaying ? (
          <Pressable onPress={toggleSpeed} style={styles.speedButton}>
            <Text style={styles.speedText}>{SPEEDS[speedIndex]}×</Text>
          </Pressable>
        ) : (
          <Image
            source={{ uri: imageUrl || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3' }}
            style={styles.thumbnailImage}
          />
        )}
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },
  playButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    flex: 1,
    marginHorizontal: 8,
  },
  waveformContainer: {
    height: 40,
    justifyContent: 'center',
    position: 'relative',
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
    gap: 1,
    marginTop: 25,
  },
  waveformBar: {
    width: 2,
    borderRadius: 1,
    flex: 1,
  },
  progressCircle: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#00A884',
    top: '80%',
    marginInlineStart: 4,
    marginTop: -8,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,

  },

  timestamp: {
    color: '#667781',
    fontSize: 12,
    marginTop: 12,
  },
  speedButton: {
    backgroundColor: '#8696A0',
    borderRadius: 50,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginLeft: 8,
  },
  speedText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  thumbnailImage: {
    width: 50,
    height: 50,
    borderRadius: 50,
    marginLeft: 8,

  },
});