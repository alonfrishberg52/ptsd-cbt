import React, { useState } from 'react';
import { View, Text, TextInput, Button, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';

const SOMATIC_CATEGORIES = [
  { key: 'general', label: 'סומטי כללי', symptoms: ['מתח', 'חולשה', 'עייפות', 'פיהוקים', 'שיהוקים', 'אנחות', 'תחושת עילפון'] },
  { key: 'mouth_jaw', label: 'פה ולסת', symptoms: ['פה יבש', 'חריקת שיניים', 'כאבים בלסת'] },
  { key: 'neurological', label: 'נוירולוגי/אף אוזן גרון', symptoms: ['עקצוצים', 'נימולים', 'סחרחורות', 'כאבי ראש', 'מיגרנות', 'טיניטוס', 'רגישות לרעשים', 'טשטוש ראיה', 'גלים של קור וחום', 'קול לא יציב', 'גמגום'] },
  { key: 'musculoskeletal', label: 'מוסקלוסקלטלי', symptoms: ['כאבי שרירים', 'קישיון שרירים'] },
  { key: 'dermatological', label: 'דרמטולוגי', symptoms: ['הסמקה', 'חיוורון', 'הזעה', 'גרד', 'פריחה חוזרת', 'צמרמורת שיער'] },
  { key: 'cardiovascular', label: 'קרדיו-וסקולרי', symptoms: ['קצב לב מהיר', 'דופק חזק', 'תעוקת חזה', 'תחושת איבוד פעימה'] },
  { key: 'respiratory', label: 'ריספרטורי', symptoms: ['קוצר נשימה', 'תחושת מחנק', 'צורך באוויר', 'נשימה מהירה'] },
  { key: 'gastrointestinal', label: 'גסטרואינטסטינלים', symptoms: ['קשיי בליעה', 'גוש בגרון', 'צרבת', 'כאבי בטן', 'בחילות', 'הקאות', 'קרקורים בבטן', 'שלשולים', 'עצירות', 'ירידה במשקל'] },
  { key: 'genitourinary', label: 'גניטואורינרים', symptoms: ['תכיפות שתן', 'דחיפות שתן', 'אצירת שתן', 'היעדר ווסת', 'ווסת לא סדירה', 'דימום וסתי כבד', 'חוסר חשק מיני', 'אימפטונציה'] },
];

const PCL5_QUESTIONS = [
  'זיכרונות חוזרים, מטרידים ובלתי רצויים של החוויה המלחיצה?',
  'חלומות חוזרים ומטרידים על החוויה המלחיצה?',
  'פתאום להרגיש או להתנהג כאילו החוויה המלחיצה מתרחשת שוב?',
  'להרגיש מאוד נסער כאשר משהו מזכיר לך את החוויה המלחיצה?',
  'תגובות גופניות חזקות כאשר משהו מזכיר לך את החוויה המלחיצה?',
  'הימנעות מזיכרונות, מחשבות או רגשות הקשורים לחוויה המלחיצה?',
  'הימנעות מתזכורות חיצוניות לחוויה המלחיצה?',
  'קושי להיזכר בחלקים חשובים של החוויה המלחיצה?',
  'אמונות שליליות חזקות לגבי עצמך, אנשים אחרים או העולם?',
  'להאשים את עצמך או מישהו אחר על החוויה המלחיצה או מה שקרה אחריה?',
  'רגשות שליליים חזקים כמו פחד, אימה, כעס, אשמה או בושה?',
  'אובדן עניין בפעילויות שנהנית מהן בעבר?',
  'להרגיש מרוחק או מנותק מאנשים אחרים?',
  'קושי לחוות רגשות חיוביים?',
  'התנהגות עצבנית, התפרצויות כעס או התנהגות תוקפנית?',
  'לקחת יותר מדי סיכונים או לעשות דברים שעלולים לגרום לך נזק?',
  'להיות "סופר-דרוך" או ערני ומוכן לסכנה?',
  'להרגיש לחוץ או להיבהל בקלות?',
  'קושי להתרכז?',
  'קושי להירדם או להישאר ישן?'
];

const PHQ9_QUESTIONS = [
  'מצב רוח ירוד',
  'אנהדוניה (חוסר הנאה)',
  'חוסר ערך עצמי',
  'תחושת אשמה',
  'חוסר פעילות',
  'איטיות',
  'חוסר תיאבון',
  'הפרעות שינה',
  'עייפות',
  'בעיות ריכוז',
  'נטיה לבכי'
];

export default function PatientProfileForm({ onSave, initialData = {} }) {
  const [profile, setProfile] = useState({
    name: initialData.name || '',
    age: initialData.age || '',
    city: initialData.city || '',
    triggers: initialData.triggers || [{ name: '', sud: 0 }],
    avoidances: initialData.avoidances || [{ name: '', sud: 0 }],
    somatic: initialData.somatic || {},
    pcl5: initialData.pcl5 || Array(20).fill(0),
    phq9: initialData.phq9 || Array(11).fill(0),
  });
  const [saving, setSaving] = useState(false);

  // Handlers for dynamic fields (triggers, avoidances, somatic, etc.)
  const handleTriggerChange = (idx, key, value) => {
    const updated = [...profile.triggers];
    updated[idx][key] = value;
    setProfile({ ...profile, triggers: updated });
  };
  const addTrigger = () => setProfile({ ...profile, triggers: [...profile.triggers, { name: '', sud: 0 }] });
  const removeTrigger = idx => setProfile({ ...profile, triggers: profile.triggers.filter((_, i) => i !== idx) });

  const handleAvoidanceChange = (idx, key, value) => {
    const updated = [...profile.avoidances];
    updated[idx][key] = value;
    setProfile({ ...profile, avoidances: updated });
  };
  const addAvoidance = () => setProfile({ ...profile, avoidances: [...profile.avoidances, { name: '', sud: 0 }] });
  const removeAvoidance = idx => setProfile({ ...profile, avoidances: profile.avoidances.filter((_, i) => i !== idx) });

  const handleSomaticToggle = (cat, symptom) => {
    const catList = profile.somatic[cat] || [];
    const updated = catList.includes(symptom)
      ? catList.filter(s => s !== symptom)
      : [...catList, symptom];
    setProfile({ ...profile, somatic: { ...profile.somatic, [cat]: updated } });
  };

  const handlePCL5Change = (idx, value) => {
    const updated = [...profile.pcl5];
    updated[idx] = value;
    setProfile({ ...profile, pcl5: updated });
  };
  const handlePHQ9Change = (idx, value) => {
    const updated = [...profile.phq9];
    updated[idx] = value;
    setProfile({ ...profile, phq9: updated });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('http://10.100.102.10:5000/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (data.status === 'success') {
        Alert.alert('נשמר בהצלחה');
        onSave && onSave(profile);
      } else {
        Alert.alert('שגיאה', data.message || 'שגיאה בשמירה');
      }
    } catch (e) {
      Alert.alert('שגיאה', e.message || 'שגיאה בשמירה');
    }
    setSaving(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>פרופיל מטופל</Text>
      <TextInput style={styles.input} placeholder="שם" value={profile.name} onChangeText={v => setProfile({ ...profile, name: v })} />
      <TextInput style={styles.input} placeholder="גיל" value={profile.age} onChangeText={v => setProfile({ ...profile, age: v })} keyboardType="numeric" />
      <TextInput style={styles.input} placeholder="עיר" value={profile.city} onChangeText={v => setProfile({ ...profile, city: v })} />
      {/* Triggers */}
      <Text style={styles.sectionTitle}>טריגרים</Text>
      {profile.triggers.map((t, idx) => (
        <View key={idx} style={styles.row}>
          <TextInput style={styles.inputSmall} placeholder="טריגר" value={t.name} onChangeText={v => handleTriggerChange(idx, 'name', v)} />
          <TextInput style={styles.inputSmall} placeholder="SUD" value={String(t.sud)} onChangeText={v => handleTriggerChange(idx, 'sud', v.replace(/\D/g, ''))} keyboardType="numeric" />
          <TouchableOpacity onPress={() => removeTrigger(idx)}><Text style={styles.removeBtn}>🗑️</Text></TouchableOpacity>
        </View>
      ))}
      <Button title="הוסף טריגר" onPress={addTrigger} />
      {/* Avoidances */}
      <Text style={styles.sectionTitle}>סיטואציות הימנעות</Text>
      {profile.avoidances.map((a, idx) => (
        <View key={idx} style={styles.row}>
          <TextInput style={styles.inputSmall} placeholder="הימנעות" value={a.name} onChangeText={v => handleAvoidanceChange(idx, 'name', v)} />
          <TextInput style={styles.inputSmall} placeholder="SUD" value={String(a.sud)} onChangeText={v => handleAvoidanceChange(idx, 'sud', v.replace(/\D/g, ''))} keyboardType="numeric" />
          <TouchableOpacity onPress={() => removeAvoidance(idx)}><Text style={styles.removeBtn}>🗑️</Text></TouchableOpacity>
        </View>
      ))}
      <Button title="הוסף הימנעות" onPress={addAvoidance} />
      {/* Somatic Symptoms */}
      <Text style={styles.sectionTitle}>תסמינים סומטיים</Text>
      {SOMATIC_CATEGORIES.map(cat => (
        <View key={cat.key} style={styles.somaticCat}>
          <Text style={styles.somaticCatTitle}>{cat.label}</Text>
          <View style={styles.somaticSymptomsRow}>
            {cat.symptoms.map(sym => (
              <TouchableOpacity
                key={sym}
                style={[
                  styles.somaticSymptom,
                  (profile.somatic[cat.key] || []).includes(sym) && styles.somaticSymptomSelected
                ]}
                onPress={() => handleSomaticToggle(cat.key, sym)}
              >
                <Text style={styles.somaticSymptomText}>
                  {(profile.somatic[cat.key] || []).includes(sym) ? '✔️ ' : '⬜ '} {sym}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
      {/* PCL-5 */}
      <Text style={styles.sectionTitle}>PCL-5</Text>
      {PCL5_QUESTIONS.map((q, idx) => (
        <View key={idx} style={styles.row}>
          <Text style={styles.pclLabel}>{q}</Text>
          {[0,1,2,3,4].map(val => (
            <TouchableOpacity key={val} style={[styles.pclBtn, profile.pcl5[idx] === val && styles.pclBtnSelected]} onPress={() => handlePCL5Change(idx, val)}>
              <Text style={styles.pclBtnText}>{val}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}
      {/* PHQ-9 */}
      <Text style={styles.sectionTitle}>PHQ-9</Text>
      {PHQ9_QUESTIONS.map((q, idx) => (
        <View key={idx} style={styles.row}>
          <Text style={styles.pclLabel}>{q}</Text>
          {[0,1,2,3,4].map(val => (
            <TouchableOpacity key={val} style={[styles.pclBtn, profile.phq9[idx] === val && styles.pclBtnSelected]} onPress={() => handlePHQ9Change(idx, val)}>
              <Text style={styles.pclBtnText}>{val}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}
      <Button title={saving ? 'שומר...' : 'שמור'} onPress={handleSave} disabled={saving} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#f6f7fb' },
  header: { fontSize: 22, fontWeight: 'bold', color: '#1E293B', marginBottom: 16, textAlign: 'center' },
  input: { backgroundColor: '#fff', borderRadius: 8, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#E0E8F0' },
  inputSmall: { backgroundColor: '#fff', borderRadius: 8, padding: 8, marginBottom: 8, borderWidth: 1, borderColor: '#E0E8F0', width: 120, marginRight: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#3B82F6', marginTop: 24, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' },
  removeBtn: { color: '#DC2626', fontSize: 18, marginLeft: 8 },
  somaticCat: { marginBottom: 12 },
  somaticCatTitle: { fontSize: 16, fontWeight: '600', color: '#1E293B', marginBottom: 4 },
  somaticSymptomsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  somaticSymptom: { backgroundColor: '#E0E8F0', borderRadius: 8, padding: 6, margin: 2 },
  somaticSymptomSelected: { backgroundColor: '#3B82F6' },
  somaticSymptomText: { color: '#1E293B', fontSize: 13 },
  pclLabel: { flex: 1, fontSize: 14, color: '#1E293B', marginRight: 8 },
  pclBtn: { backgroundColor: '#E0E8F0', borderRadius: 8, padding: 6, marginHorizontal: 2 },
  pclBtnSelected: { backgroundColor: '#3B82F6' },
  pclBtnText: { color: '#1E293B', fontWeight: 'bold' },
}); 