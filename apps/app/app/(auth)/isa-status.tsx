import { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors } from '@/constants/brand'

// ── Option definitions ────────────────────────────────────────────────────────

const OPTIONS = [
  {
    id: 'existing',
    icon: '✓',
    title: 'Yes, I have one',
    subtitle: 'I have an existing ISA or JISA account',
  },
  {
    id: 'new',
    icon: '🏦',
    title: 'No, I need to set one up',
    subtitle: "I'll open a new JISA — takes about 5 minutes",
  },
  {
    id: 'unsure',
    icon: '?',
    title: "I'm not sure",
    subtitle: "We'll explain what a JISA is and help you decide",
  },
]

// ── Screen ────────────────────────────────────────────────────────────────────

export default function IsaStatusScreen() {
  const router = useRouter()
  const { childName, childId } = useLocalSearchParams<{ childName: string; childId: string }>()
  const name = typeof childName === 'string' && childName.length > 0 ? childName : 'your child'
  const cid = typeof childId === 'string' ? childId : ''

  const [selected, setSelected] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  const handleOption = (id: string) => {
    setSelected(id)
    if (id === 'existing') {
      router.push({ pathname: '/(auth)/isa-link', params: { childName: name, childId: cid } })
    } else if (id === 'new') {
      router.push({ pathname: '/(auth)/isa-choose', params: { childName: name, childId: cid } })
    } else {
      setShowModal(true)
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setSelected(null)
  }

  const goToChoose = () => {
    setShowModal(false)
    router.push({ pathname: '/(auth)/isa-choose', params: { childName: name, childId: cid } })
  }

  const goToLink = () => {
    setShowModal(false)
    router.push({ pathname: '/(auth)/isa-link', params: { childName: name, childId: cid } })
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.progress}>4 of 8</Text>
        </View>

        <Text style={styles.headline}>
          Does {name} already have an ISA or JISA?
        </Text>
        <Text style={styles.subheadline}>
          We need somewhere to send the cashback you earn.
        </Text>

        {/* Option cards */}
        <View style={styles.options}>
          {OPTIONS.map((opt) => {
            const isSelected = selected === opt.id
            return (
              <TouchableOpacity
                key={opt.id}
                style={[styles.card, isSelected && styles.cardSelected]}
                onPress={() => handleOption(opt.id)}
                activeOpacity={0.85}
              >
                <View style={[styles.cardIcon, isSelected && styles.cardIconSelected]}>
                  <Text style={styles.cardIconText}>{opt.icon}</Text>
                </View>
                <View style={styles.cardBody}>
                  <Text style={[styles.cardTitle, isSelected && styles.cardTitleSelected]}>
                    {opt.title}
                  </Text>
                  <Text style={styles.cardSubtitle}>{opt.subtitle}</Text>
                </View>
                <Text style={[styles.chevron, isSelected && styles.chevronSelected]}>›</Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </ScrollView>

      {/* JISA explainer — bottom sheet modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={closeModal} activeOpacity={1} />
          <View style={styles.modalSheet}>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={closeModal} activeOpacity={0.7}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>

            <Text style={styles.modalTitle}>ISA or JISA?</Text>
            <Text style={styles.modalBody}>
              {`There are two types of tax-free savings accounts to consider:\n\nA Stocks & Shares ISA is in your own name. You control it, can top it up whenever you like, and decide if and when to pass the money to your child. It counts toward your £20,000 annual ISA allowance. We recommend this for most Amplifi families — you stay in control.\n\nA Junior ISA (JISA) is opened in your child's name. Money grows tax-free and is locked until they turn 18. You can contribute up to £9,000 per year.\n\n⚠️ Important: Your child takes full control of the funds at 18. Once money is in a JISA, you cannot get it back — it belongs to your child.`}
            </Text>

            <TouchableOpacity style={styles.modalCta} onPress={goToLink} activeOpacity={0.85}>
              <Text style={styles.modalCtaText}>Help me link my ISA or JISA</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalSecondary}
              onPress={goToChoose}
              activeOpacity={0.7}
            >
              <Text style={styles.modalSecondaryText}>I need to open an ISA or JISA</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ffffff' },
  scroll: { paddingHorizontal: 24, paddingBottom: 48 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  backBtn: { padding: 4 },
  backArrow: { fontSize: 22, color: colors.midnight },
  progress: { fontSize: 14, color: '#64748b', fontWeight: '600' },
  headline: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.midnight,
    letterSpacing: -0.5,
    marginTop: 8,
    marginBottom: 8,
    lineHeight: 34,
  },
  subheadline: {
    fontSize: 15,
    color: '#64748b',
    lineHeight: 22,
    marginBottom: 32,
  },
  options: { gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.midnight,
    borderRadius: 16,
    padding: 18,
    backgroundColor: '#ffffff',
    gap: 14,
  },
  cardSelected: {
    borderColor: colors.sky,
    backgroundColor: '#f0fbff',
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardIconSelected: { backgroundColor: `${colors.sky}22` },
  cardIconText: { fontSize: 20 },
  cardBody: { flex: 1 },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.midnight,
    marginBottom: 3,
  },
  cardTitleSelected: { color: colors.sky },
  cardSubtitle: { fontSize: 13, color: '#64748b', lineHeight: 18 },
  chevron: { fontSize: 22, color: '#94a3b8', flexShrink: 0 },
  chevronSelected: { color: colors.sky },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 28,
    paddingBottom: 40,
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: { fontSize: 16, color: '#94a3b8', fontWeight: '600' },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.midnight,
    marginBottom: 14,
    marginTop: 4,
    letterSpacing: -0.3,
  },
  modalBody: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 24,
    marginBottom: 28,
  },
  modalCta: {
    backgroundColor: colors.sky,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 12,
  },
  modalCtaText: { color: colors.midnight, fontSize: 16, fontWeight: '700' },
  modalSecondary: { alignItems: 'center', paddingVertical: 10 },
  modalSecondaryText: { fontSize: 14, color: '#64748b', fontWeight: '600' },
})
