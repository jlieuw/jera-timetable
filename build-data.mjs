// Parses the saved Jera On Air timetable HTML files and emits data.js
// Run: node build-data.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const DAYS = [
  { key: 'THU', label: 'Donderdag 25 juni', file: 'thu.html', date: '2026-06-25' },
  { key: 'FRI', label: 'Vrijdag 26 juni',   file: 'fri.html', date: '2026-06-26' },
  { key: 'SAT', label: 'Zaterdag 27 juni',  file: 'sat.html', date: '2026-06-27' },
];

const STAGES = ['eagle', 'vulture', 'buzzard', 'hawk', 'sparrow', 'raven', 'quail', 'nightingale'];

// Decode minimal HTML entities found in band names
function decode(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

// Convert a 5-min grid column index (1-based) + day start hour to "HH:MM"
function colToTime(col, startHour) {
  const minutesFromStart = (col - 1) * 5;
  const totalMinutes = startHour * 60 + minutesFromStart;
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function parseDay(html, startHour) {
  // Split on stage-row markers so we can attribute acts to a stage
  // Pattern: <div class="stage-row STAGE" ... > ... </div>  (followed by next stage-row or close)
  const result = {};
  for (const stage of STAGES) result[stage] = [];

  // Find each stage block
  const stageRe = /<div class="stage-row (\w+)"[^>]*>([\s\S]*?)(?=<div class="stage-row \w+"|<\/div>\s*<\/div>\s*<\/div>)/g;
  let m;
  while ((m = stageRe.exec(html)) !== null) {
    const stage = m[1];
    const block = m[2];
    if (!STAGES.includes(stage)) continue;

    const actRe = /<button class="performance[^"]*"\s*style="grid-column:\s*(\d+)\s*\/\s*(\d+);"\s*data-band="(\d+)">\s*<span class="band-name">\s*([\s\S]*?)\s*<\/span>\s*<span class="time-range">\s*([\d:]+)\s*-\s*([\d:]+)\s*<\/span>/g;
    let a;
    while ((a = actRe.exec(block)) !== null) {
      const colStart = parseInt(a[1], 10);
      const colEnd = parseInt(a[2], 10);
      const id = a[3];
      const name = decode(a[4]);
      const startTime = a[5];
      const endTime = a[6];
      // Convert columns into minute offsets from day start (start hour at col 1)
      const startMin = (colStart - 1) * 5;
      const endMin = (colEnd - 1) * 5;
      result[stage].push({
        id,
        name,
        start: startTime,
        end: endTime,
        startMin,
        endMin,
      });
    }
    // Sort by startMin
    result[stage].sort((a, b) => a.startMin - b.startMin);
  }
  return result;
}

const out = { days: [], stages: STAGES };

for (const day of DAYS) {
  const html = readFileSync(day.file, 'utf8');
  const startHour = day.key === 'THU' ? 14 : 11;
  const endHour = day.key === 'THU' ? 26 : 27; // 02:00 next day or 03:00 next day
  const totalMinutes = (endHour - startHour) * 60;
  const stages = parseDay(html, startHour);
  out.days.push({
    key: day.key,
    label: day.label,
    date: day.date,
    startHour,
    endHour,
    totalMinutes,
    stages,
  });
}

const totalActs = out.days.reduce(
  (s, d) => s + STAGES.reduce((ss, st) => ss + d.stages[st].length, 0),
  0
);

writeFileSync('data.js', 'window.TIMETABLE = ' + JSON.stringify(out, null, 2) + ';\n');
console.log(`Wrote data.js with ${out.days.length} days, ${totalActs} acts.`);
for (const d of out.days) {
  for (const st of STAGES) {
    if (d.stages[st].length) {
      console.log(`  ${d.key} ${st}: ${d.stages[st].length} acts`);
    }
  }
}
