/**
 * SimpleMarkdown — renderiza markdown básico em React Native sem libs externas
 * Suporta: **bold**, *italic*, `code`, # headings, - listas, \n parágrafos
 */
import React from 'react';
import { Text, View, StyleSheet } from 'react-native';

interface Props {
  text: string;
  textStyle?: object;
}

function parseLine(line: string, key: number, baseStyle: object) {
  // Heading
  if (line.startsWith('### ')) return <Text key={key} style={[styles.h3, baseStyle]}>{line.slice(4)}</Text>;
  if (line.startsWith('## '))  return <Text key={key} style={[styles.h2, baseStyle]}>{line.slice(3)}</Text>;
  if (line.startsWith('# '))   return <Text key={key} style={[styles.h1, baseStyle]}>{line.slice(2)}</Text>;

  // List item
  if (line.startsWith('- ') || line.startsWith('• ')) {
    return (
      <View key={key} style={styles.listRow}>
        <Text style={[styles.bullet, baseStyle]}>•</Text>
        <Text style={[styles.listText, baseStyle]}>{parseInline(line.slice(2))}</Text>
      </View>
    );
  }

  // Empty line
  if (!line.trim()) return <View key={key} style={styles.spacer} />;

  // Normal paragraph
  return <Text key={key} style={[styles.p, baseStyle]}>{parseInline(line)}</Text>;
}

function parseInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Regex matches **bold**, *italic*, `code`
  const rx = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let last = 0;
  let match;
  let i = 0;
  while ((match = rx.exec(text)) !== null) {
    if (match.index > last) parts.push(<Text key={i++}>{text.slice(last, match.index)}</Text>);
    if (match[0].startsWith('**')) parts.push(<Text key={i++} style={styles.bold}>{match[2]}</Text>);
    else if (match[0].startsWith('*')) parts.push(<Text key={i++} style={styles.italic}>{match[3]}</Text>);
    else parts.push(<Text key={i++} style={styles.code}>{match[4]}</Text>);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(<Text key={i++}>{text.slice(last)}</Text>);
  return parts;
}

export function SimpleMarkdown({ text, textStyle = {} }: Props) {
  const lines = text.split('\n');
  return (
    <View style={styles.wrap}>
      {lines.map((line, i) => parseLine(line, i, textStyle))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 2 },
  h1: { fontSize: 18, fontWeight: '900', color: '#F9FAFB', marginBottom: 4 },
  h2: { fontSize: 16, fontWeight: '800', color: '#F9FAFB', marginBottom: 2 },
  h3: { fontSize: 14, fontWeight: '700', color: '#E5E7EB', marginBottom: 2 },
  p: { fontSize: 14, color: '#D1D5DB', lineHeight: 21 },
  bold: { fontWeight: '800', color: '#F9FAFB' },
  italic: { fontStyle: 'italic', color: '#D1D5DB' },
  code: { fontFamily: 'monospace', backgroundColor: '#1F2937', color: '#60A5FA', paddingHorizontal: 4, borderRadius: 4, fontSize: 13 },
  listRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  bullet: { fontSize: 14, color: '#6B7280', marginTop: 3 },
  listText: { flex: 1, fontSize: 14, color: '#D1D5DB', lineHeight: 21 },
  spacer: { height: 6 },
});
