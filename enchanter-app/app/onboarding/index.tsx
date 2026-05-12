import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, Spacing, Typography } from '../../constants/theme';

const { width, height } = Dimensions.get('window');

export const ONBOARDING_KEY = 'enchanter_has_seen_onboarding';

// ---------------------------------------------------------------------------
// Slide data
// ---------------------------------------------------------------------------
const SLIDES = [
  {
    key: 'discover',
    title: 'Magic is\nearned, not\nselected.',
    body: 'Enchanter is a real-world spell crafting layer for tabletop RPGs. Travel to sacred sites across the UK, read the sky and the earth, and forge spells that no one else can.',
    accentColor: Colors.violet,
    icon: <DiscoverIcon />,
  },
  {
    key: 'craft',
    title: 'Place.\nCondition.\nFingerprint.',
    body: 'Your spell's power is shaped by where you stand, the phase of the moon, the pressure in the air or the activity of the sun — and the moment you choose to craft.',
    accentColor: Colors.gold,
    icon: <CraftIcon />,
  },
  {
    key: 'share',
    title: 'Every spell\nhas a\nlineage.',
    body: 'Share your spells with the global library. Transfer them in person. Every hand a spell passes through is recorded — from the moment of crafting to the table where it's played.',
    accentColor: Colors.coastal,
    icon: <ShareIcon />,
  },
];

// ---------------------------------------------------------------------------
// SVG-style placeholder icons (React Native View-based)
// ---------------------------------------------------------------------------
function DiscoverIcon() {
  // Crescent moon + three stars
  return (
    <View style={iconStyles.container}>
      {/* Moon body */}
      <View style={[iconStyles.moonOuter, { borderColor: Colors.violet }]}>
        <View style={[iconStyles.moonInner, { backgroundColor: Colors.bg }]} />
      </View>
      {/* Stars */}
      <View style={[iconStyles.star, { top: 18, right: 28 }]} />
      <View style={[iconStyles.star, { top: 44, right: 14, width: 5, height: 5 }]} />
      <View style={[iconStyles.star, { top: 8, right: 52, width: 4, height: 4 }]} />
    </View>
  );
}

function CraftIcon() {
  // Compass rose / radial lines suggesting celestial measurement
  const spokes = 8;
  return (
    <View style={iconStyles.container}>
      {Array.from({ length: spokes }).map((_, i) => {
        const angle = (i * Math.PI * 2) / spokes;
        const len = i % 2 === 0 ? 38 : 24;
        const x = Math.cos(angle) * len;
        const y = Math.sin(angle) * len;
        return (
          <View
            key={i}
            style={[
              iconStyles.spoke,
              {
                width: i % 2 === 0 ? 2 : 1.5,
                height: len,
                backgroundColor: i % 2 === 0 ? Colors.gold : Colors.goldDim,
                transform: [
                  { translateX: x / 2 },
                  { translateY: y / 2 },
                  { rotate: `${(i * 360) / spokes}deg` },
                ],
              },
            ]}
          />
        );
      })}
      {/* Centre dot */}
      <View style={[iconStyles.centreDot, { backgroundColor: Colors.gold }]} />
    </View>
  );
}

function ShareIcon() {
  // Three dots connected by lines — lineage chain metaphor
  return (
    <View style={iconStyles.container}>
      {/* Vertical connector lines */}
      <View style={[iconStyles.lineV, { left: '50%', top: 24, height: 22, backgroundColor: Colors.coastal }]} />
      <View style={[iconStyles.lineV, { left: '50%', top: 62, height: 22, backgroundColor: Colors.coastal }]} />
      {/* Nodes */}
      <View style={[iconStyles.node, { top: 10, alignSelf: 'center', borderColor: Colors.coastal }]} />
      <View style={[iconStyles.node, { top: 44, alignSelf: 'center', borderColor: Colors.coastal, width: 18, height: 18, borderRadius: 9 }]} />
      <View style={[iconStyles.node, { top: 82, alignSelf: 'center', borderColor: Colors.coastal, width: 14, height: 14, borderRadius: 7 }]} />
    </View>
  );
}

const iconStyles = StyleSheet.create({
  container: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  moonOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },
  moonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    position: 'absolute',
    top: -8,
    right: -8,
  },
  star: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.violet,
  },
  spoke: {
    position: 'absolute',
    borderRadius: 1,
    transformOrigin: 'bottom',
  },
  centreDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  lineV: {
    position: 'absolute',
    width: 2,
    marginLeft: -1,
  },
  node: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
});

// ---------------------------------------------------------------------------
// Slide component
// ---------------------------------------------------------------------------
function Slide({
  item,
  index,
}: {
  item: (typeof SLIDES)[0];
  index: number;
}) {
  return (
    <View style={[slideStyles.container, { width }]}>
      {/* Radial glow behind icon */}
      <View
        style={[
          slideStyles.glow,
          {
            backgroundColor: item.accentColor,
            opacity: 0.07,
          },
        ]}
      />

      {/* Icon */}
      <View style={slideStyles.iconWrap}>{item.icon}</View>

      {/* Slide number */}
      <Text style={slideStyles.slideNumber}>0{index + 1}</Text>

      {/* Title */}
      <Text style={[slideStyles.title, { color: item.accentColor }]}>
        {item.title}
      </Text>

      {/* Body */}
      <Text style={slideStyles.body}>{item.body}</Text>
    </View>
  );
}

const slideStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  glow: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    top: '20%',
  },
  iconWrap: {
    marginBottom: Spacing.xl,
  },
  slideNumber: {
    fontFamily: Typography.mono,
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 4,
    marginBottom: Spacing.sm,
  },
  title: {
    fontFamily: Typography.display,
    fontSize: 36,
    lineHeight: 44,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  body: {
    fontFamily: Typography.body,
    fontSize: 17,
    lineHeight: 26,
    color: Colors.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
  },
});

// ---------------------------------------------------------------------------
// Dot indicator
// ---------------------------------------------------------------------------
function Dots({ activeIndex }: { activeIndex: number }) {
  return (
    <View style={dotStyles.row}>
      {SLIDES.map((s, i) => (
        <View
          key={s.key}
          style={[
            dotStyles.dot,
            i === activeIndex
              ? dotStyles.dotActive
              : dotStyles.dotInactive,
          ]}
        />
      ))}
    </View>
  );
}

const dotStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  dot: {
    borderRadius: Radius.full,
  },
  dotActive: {
    width: 24,
    height: 4,
    backgroundColor: Colors.gold,
  },
  dotInactive: {
    width: 6,
    height: 6,
    backgroundColor: Colors.border,
  },
});

// ---------------------------------------------------------------------------
// Main onboarding screen
// ---------------------------------------------------------------------------
export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  const isLast = activeIndex === SLIDES.length - 1;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setActiveIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  async function handleFinish() {
    await SecureStore.setItemAsync(ONBOARDING_KEY, 'true');
    router.replace('/auth/login');
  }

  function handleNext() {
    if (isLast) {
      handleFinish();
    } else {
      listRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    }
  }

  function handleSkip() {
    handleFinish();
  }

  return (
    <View style={[styles.screen, { backgroundColor: Colors.bg }]}>
      {/* Skip — top right, hidden on last slide */}
      {!isLast && (
        <Pressable
          onPress={handleSkip}
          style={[styles.skipBtn, { top: insets.top + Spacing.md }]}
          hitSlop={12}
        >
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      )}

      {/* Slides */}
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(s) => s.key}
        renderItem={({ item, index }) => <Slide item={item} index={index} />}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        style={{ flex: 1 }}
      />

      {/* Bottom controls */}
      <View
        style={[
          styles.controls,
          { paddingBottom: insets.bottom + Spacing.lg },
        ]}
      >
        <Dots activeIndex={activeIndex} />

        <Pressable
          onPress={handleNext}
          style={({ pressed }) => [
            styles.ctaBtn,
            isLast && styles.ctaBtnLast,
            pressed && styles.ctaBtnPressed,
          ]}
        >
          <Text style={[styles.ctaText, isLast && styles.ctaTextLast]}>
            {isLast ? 'Begin' : 'Continue'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  skipBtn: {
    position: 'absolute',
    right: Spacing.lg,
    zIndex: 10,
  },
  skipText: {
    fontFamily: Typography.body,
    fontSize: 15,
    color: Colors.textMuted,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  ctaBtn: {
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  ctaBtnLast: {
    backgroundColor: Colors.gold,
  },
  ctaBtnPressed: {
    opacity: 0.7,
  },
  ctaText: {
    fontFamily: Typography.display,
    fontSize: 14,
    color: Colors.gold,
    letterSpacing: 1,
  },
  ctaTextLast: {
    color: Colors.bg,
  },
});
