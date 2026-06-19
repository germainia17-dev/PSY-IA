import { useState } from 'react'
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '../hooks/use-theme'
import { type as typo } from '../constants/type'

type Tab = 'policy' | 'privacy'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useTheme()
  return (
    <View style={styles.section}>
      <Text style={[typo.subtitle as object, { color: colors.text, marginBottom: 12 }]}>{title}</Text>
      {children}
    </View>
  )
}

function Paragraph({ children }: { children: React.ReactNode }) {
  const colors = useTheme()
  return (
    <Text style={[typo.label as object, { color: colors.textMuted, lineHeight: 21, marginBottom: 12 }]}>
      {children}
    </Text>
  )
}

function BulletPoint({ children }: { children: React.ReactNode }) {
  const colors = useTheme()
  return (
    <View style={styles.bulletContainer}>
      <Text style={[typo.label as object, { color: colors.accent, fontSize: 16, marginRight: 8 }]}>
        •
      </Text>
      <Text style={[typo.label as object, { color: colors.textMuted, flex: 1, lineHeight: 20 }]}>
        {children}
      </Text>
    </View>
  )
}

export default function PolicyScreen() {
  const colors = useTheme()
  const [tab, setTab] = useState<Tab>('policy')

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['bottom']}>
      {/* Tab selector */}
      <View style={styles.tabBar}>
        <Pressable
          onPress={() => setTab('policy')}
          style={[
            styles.tab,
            tab === 'policy' && { borderBottomColor: colors.accent, borderBottomWidth: 2 },
          ]}>
          <Text
            style={[
              typo.label as object,
              { color: tab === 'policy' ? colors.text : colors.textMuted },
            ]}>
            Politique
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('privacy')}
          style={[
            styles.tab,
            tab === 'privacy' && { borderBottomColor: colors.accent, borderBottomWidth: 2 },
          ]}>
          <Text
            style={[
              typo.label as object,
              { color: tab === 'privacy' ? colors.text : colors.textMuted },
            ]}>
            Confidentialité
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 40 }]} showsVerticalScrollIndicator={false}>
        {tab === 'policy' ? (
          <>
            <Section title="Conditions d'utilisation">
              <Paragraph>
                Companion IA est une application mobile conçue pour offrir un soutien psychologique. En utilisant
                Companion IA, vous acceptez les présentes conditions d'utilisation.
              </Paragraph>
            </Section>

            <Section title="Utilisation acceptable">
              <BulletPoint>Vous utiliserez l'application de manière légale et éthique</BulletPoint>
              <BulletPoint>Vous ne tenterez pas de contourner les limitations de sécurité</BulletPoint>
              <BulletPoint>Vous ne ferez pas de scraping ou extraction de données massives</BulletPoint>
              <BulletPoint>
                Vous acceptez que l'application est un outil d'accompagnement, pas un substitut à une thérapie
                professionnelle
              </BulletPoint>
            </Section>

            <Section title="Limitation de responsabilité">
              <Paragraph>
                Companion IA est fournie "tel quel". Nous ne garantissons pas que l'application sera sans erreurs,
                ininterrompue ou qu'elle répondra à vos besoins spécifiques.
              </Paragraph>
              <BulletPoint>
                En cas de crise ou d'urgence psychologique, contactez immédiatement un professionnel de santé
                mentale ou appelez une ligne d'urgence
              </BulletPoint>
              <BulletPoint>
                Companion IA ne remplace pas un diagnostic ou un traitement médical professionnel
              </BulletPoint>
              <BulletPoint>Vous utilisez l'application à vos propres risques</BulletPoint>
            </Section>

            <Section title="Modifications des conditions">
              <Paragraph>
                Nous nous réservons le droit de modifier ces conditions à tout moment. Les modifications entrent en
                vigueur dès leur publication. Votre utilisation continue de l'application constitue votre acceptation
                des conditions modifiées.
              </Paragraph>
            </Section>

            <Section title="Résiliation">
              <Paragraph>
                Vous pouvez supprimer votre compte et arrêter d'utiliser Companion IA à tout moment. Vous pouvez
                demander la suppression complète de vos données en contactant notre équipe via l'écran "Mon compte".
              </Paragraph>
            </Section>

            <Section title="Droit applicable">
              <Paragraph>
                Ces conditions sont régies par le droit français. Tout litige sera soumis à la juridiction des
                tribunaux compétents en France.
              </Paragraph>
            </Section>
          </>
        ) : (
          <>
            <Section title="Politique de confidentialité">
              <Paragraph>
                Votre confidentialité est au cœur de Companion IA. Cette politique explique clairement quelles données
                nous collectons, comment nous les utilisons, et comment nous les protégeons.
              </Paragraph>
            </Section>

            <Section title="Données collectées">
              <Paragraph>
                <Text style={{ fontFamily: 'Inter_700Bold' }}>Nous collectons explicitement :</Text>
              </Paragraph>
              <BulletPoint>
                <Text style={{ fontFamily: 'Inter_700Bold' }}>Conversations :</Text> Le texte complet de vos échanges
                avec Companion IA (stocké localement + optionnellement en cloud si vous êtes connecté)
              </BulletPoint>
              <BulletPoint>
                <Text style={{ fontFamily: 'Inter_700Bold' }}>Humeurs :</Text> Les scores d'humeur quotidiens que vous
                enregistrez (1-5)
              </BulletPoint>
              <BulletPoint>
                <Text style={{ fontFamily: 'Inter_700Bold' }}>Email :</Text> Uniquement si vous vous connectez via lien
                magique (stocké dans Supabase)
              </BulletPoint>
              <BulletPoint>
                <Text style={{ fontFamily: 'Inter_700Bold' }}>Informations d'abonnement :</Text> Votre statut Pro via
                Stripe (géré par Stripe, pas stocké localement)
              </BulletPoint>
            </Section>

            <Section title="Données NON collectées">
              <BulletPoint>
                <Text style={{ fontFamily: 'Inter_700Bold' }}>Pas de localisation :</Text> Nous n'accédons jamais à
                votre GPS ou localisation
              </BulletPoint>
              <BulletPoint>
                <Text style={{ fontFamily: 'Inter_700Bold' }}>Pas de contacts :</Text> Nous n'accédons jamais à votre
                carnet d'adresses
              </BulletPoint>
              <BulletPoint>
                <Text style={{ fontFamily: 'Inter_700Bold' }}>Pas de fichiers :</Text> Nous n'accédons pas à vos
                fichiers personnels (sauf images uploadées via le sélecteur d'images)
              </BulletPoint>
              <BulletPoint>
                <Text style={{ fontFamily: 'Inter_700Bold' }}>Pas de tracking :</Text> Pas de traceurs, pixels de suivi,
                ou analytics intrusives
              </BulletPoint>
            </Section>

            <Section title="Stockage des données">
              <Paragraph>
                <Text style={{ fontFamily: 'Inter_700Bold' }}>Mode local (par défaut) :</Text> Vos conversations et
                humeurs sont stockées uniquement sur votre appareil, jamais sur nos serveurs.
              </Paragraph>
              <Paragraph>
                <Text style={{ fontFamily: 'Inter_700Bold' }}>Mode connecté (optionnel) :</Text> Si vous créez un compte
                et vous connectez, vos données sont synchronisées vers Supabase (base de données sécurisée). Vous
                conservez la propriété complète de vos données.
              </Paragraph>
              <Paragraph>
                <Text style={{ fontFamily: 'Inter_700Bold' }}>Aucun chiffrement côté serveur :</Text> Vos conversations
                en cloud ne sont PAS chiffrées par Companion IA. Supabase utilise HTTPS et respecte les normes de
                sécurité PostgreSQL, mais vos données ne sont pas dupliquées ou partagées.
              </Paragraph>
            </Section>

            <Section title="Utilisation des données">
              <BulletPoint>Nous utilisons vos données UNIQUEMENT pour :</BulletPoint>
              <BulletPoint>Vous fournir le service Companion IA</BulletPoint>
              <BulletPoint>Générer vos graphiques d'évolution localement</BulletPoint>
              <BulletPoint>Synchroniser vos données entre appareils (si connecté)</BulletPoint>
              <BulletPoint>
                <Text style={{ fontFamily: 'Inter_700Bold' }}>Nous NE vendons JAMAIS vos données.</Text> Nous ne les
                partageons pas avec des tiers, sauf si légalement obligés (ex. assignation en justice).
              </BulletPoint>
            </Section>

            <Section title="Sécurité">
              <BulletPoint>
                <Text style={{ fontFamily: 'Inter_700Bold' }}>Connexion sécurisée :</Text> Supabase utilise HTTPS, JWT
                tokens, et RLS (Row Level Security)
              </BulletPoint>
              <BulletPoint>
                <Text style={{ fontFamily: 'Inter_700Bold' }}>Données locales :</Text> Stockées avec AsyncStorage
                (standard sur React Native)
              </BulletPoint>
              <BulletPoint>
                <Text style={{ fontFamily: 'Inter_700Bold' }}>Pas de mots de passe :</Text> Nous utilisons des liens
                magiques (authentication sans mot de passe)
              </BulletPoint>
            </Section>

            <Section title="Vos droits (RGPD)">
              <BulletPoint>
                <Text style={{ fontFamily: 'Inter_700Bold' }}>Droit d'accès :</Text> Vous pouvez demander l'export de
                vos données
              </BulletPoint>
              <BulletPoint>
                <Text style={{ fontFamily: 'Inter_700Bold' }}>Droit de suppression :</Text> Vous pouvez demander la
                suppression complète de votre compte et de vos données
              </BulletPoint>
              <BulletPoint>
                <Text style={{ fontFamily: 'Inter_700Bold' }}>Droit de portabilité :</Text> Vous pouvez exporter vos
                conversations en JSON
              </BulletPoint>
              <BulletPoint>
                <Text style={{ fontFamily: 'Inter_700Bold' }}>Droit d'opposition :</Text> Vous pouvez vous opposer à la
                synchronisation cloud à tout moment
              </BulletPoint>
            </Section>

            <Section title="Contact & demandes RGPD">
              <Paragraph>
                Pour exercer vos droits, demander l'accès à vos données, ou signaler une préoccupation de
                confidentialité, contactez-nous via l'écran "Mon compte" ou envoyez un email à notre équipe.
              </Paragraph>
              <View style={{ marginTop: 16 }}>
                <Text style={[typo.caption as object, { fontFamily: 'Inter_700Bold', lineHeight: 18 }]}>
                  Responsable des données : Companion IA {'\n'} Juridiction : France {'\n'} Dernière mise à jour : Juin
                  2026
                </Text>
              </View>
            </Section>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  section: {
    marginBottom: 24,
  },
  bulletContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
})
