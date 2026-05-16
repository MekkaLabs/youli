import React from 'react';
import { View, TouchableOpacity, Image, Text, StyleSheet } from 'react-native';

interface ImageAttachmentProps {
  imageUri: string | null;
  onPress: () => void;
  onRemove: () => void;
}

export function ImageAttachment({ imageUri, onPress, onRemove }: ImageAttachmentProps) {
  if (!imageUri) {
    return (
      <TouchableOpacity style={styles.emptyButton} onPress={onPress} activeOpacity={0.7}>
        <Text style={styles.cameraIcon}>📷</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.imageContainer}>
      <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
      <TouchableOpacity style={styles.removeButton} onPress={onRemove} activeOpacity={0.8}>
        <Text style={styles.removeText}>×</Text>
      </TouchableOpacity>
    </View>
  );
}

export type { ImageAttachmentProps };

const styles = StyleSheet.create({
  emptyButton: {
    width: 44,
    height: 44,
    backgroundColor: '#2a2a4e',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444444',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIcon: {
    fontSize: 20,
  },
  imageContainer: {
    width: 60,
    height: 60,
    position: 'relative',
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    backgroundColor: 'red',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
    lineHeight: 18,
  },
});
