import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle, Modal } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../context/ThemeContext';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
}

interface GlassButtonProps {
  title: string;
  onPress: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  intensity?: number;
  disabled?: boolean;
}

interface GlassContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
}

interface GlassAlertProps {
  visible: boolean;
  title: string;
  message: string;
  buttons: Array<{
    text: string;
    onPress: () => void;
    style?: 'default' | 'cancel' | 'destructive';
  }>;
  onClose: () => void;
}

// Glass Card Component with blur effect
export function GlassCard({ children, style, intensity = 20, tint = 'default' }: GlassCardProps) {
  const { colors, isDarkMode } = useTheme();
  
  return (
    <View style={[styles.glassCardContainer, style]}>
      <BlurView
        intensity={intensity}
        tint={tint === 'default' ? (isDarkMode ? 'dark' : 'light') : tint}
        style={[
          styles.glassCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          }
        ]}
      >
        {children}
      </BlurView>
    </View>
  );
}

// Glass Button Component
export function GlassButton({ 
  title, 
  onPress, 
  style, 
  textStyle, 
  intensity = 15,
  disabled = false 
}: GlassButtonProps) {
  const { colors, isDarkMode } = useTheme();
  
  return (
    <TouchableOpacity 
      onPress={onPress} 
      disabled={disabled}
      style={[styles.glassButtonContainer, style]}
      activeOpacity={0.8}
    >
      <BlurView
        intensity={intensity}
        tint={isDarkMode ? 'dark' : 'light'}
        style={[
          styles.glassButton,
          {
            backgroundColor: disabled ? colors.backgroundSecondary : colors.surface,
            borderColor: colors.border,
            opacity: disabled ? 0.6 : 1,
          }
        ]}
      >
        <Text 
          style={[
            styles.glassButtonText,
            { color: disabled ? colors.textTertiary : colors.primary },
            textStyle
          ]}
        >
          {title}
        </Text>
      </BlurView>
    </TouchableOpacity>
  );
}

// Glass Container for general use
export function GlassContainer({ children, style, intensity = 25 }: GlassContainerProps) {
  const { colors, isDarkMode } = useTheme();
  
  return (
    <BlurView
      intensity={intensity}
      tint={isDarkMode ? 'dark' : 'light'}
      style={[
          styles.glassContainer,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
          style
        ]}
    >
      {children}
    </BlurView>
  );
}

// Glass Surface for backgrounds
export function GlassSurface({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const { colors } = useTheme();
  
  return (
    <View 
      style={[
        styles.glassSurface,
        {
          backgroundColor: colors.backgroundSecondary,
          borderColor: colors.border,
        },
        style
      ]}
    >
      {children}
    </View>
  );
}

// Custom Glass Alert Component
export function GlassAlert({ visible, title, message, buttons, onClose }: GlassAlertProps) {
  const { colors, isDarkMode } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.alertOverlay}>
        <View style={[styles.alertContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <BlurView
            intensity={20}
            tint={isDarkMode ? 'dark' : 'light'}
            style={styles.alertBlur}
          >
            <View style={styles.alertContent}>
              <Text style={[styles.alertTitle, { color: colors.text }]}>{title}</Text>
              <Text style={[styles.alertMessage, { color: colors.textSecondary }]}>{message}</Text>
              
              <View style={styles.alertButtons}>
                {buttons.map((button, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.alertButton,
                      { 
                        backgroundColor: button.style === 'destructive' ? colors.error + '20' : colors.backgroundSecondary,
                        borderColor: colors.border 
                      }
                    ]}
                    onPress={() => {
                      button.onPress();
                      onClose();
                    }}
                    activeOpacity={0.7}
                  >
                    <Text 
                      style={[
                        styles.alertButtonText,
                        { 
                          color: button.style === 'destructive' ? colors.error : 
                                 button.style === 'cancel' ? colors.textSecondary : colors.primary,
                          fontWeight: button.style === 'cancel' ? '400' : '600'
                        }
                      ]}
                    >
                      {button.text}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </BlurView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  glassCardContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  glassCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    backdropFilter: 'blur(20px)',
  },
  glassButtonContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  glassButton: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(15px)',
  },
  glassButtonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  glassContainer: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    backdropFilter: 'blur(25px)',
  },
  glassSurface: {
    borderRadius: 8,
    borderWidth: 0.5,
    padding: 12,
  },
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertContainer: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    maxWidth: 320,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  alertBlur: {
    borderRadius: 16,
  },
  alertContent: {
    padding: 24,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  alertMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  alertButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  alertButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  alertButtonText: {
    fontSize: 16,
  },
});