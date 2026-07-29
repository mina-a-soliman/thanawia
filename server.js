const express = require('express');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

const app = express();
const PORT = process.env.PORT || 3000;
const MAX_GRADE = 320;

const xlsxFilePath = path.join(__dirname, 'result.xlsx');

let students = [];

// Load Excel File directly into Memory on Startup
function loadExcelData() {
  if (!fs.existsSync(xlsxFilePath)) {
    console.error(`❌ Error: Source file 'result.xlsx' not found at ${xlsxFilePath}.`);
    return;
  }

  console.log('📖 Loading Excel File into memory (this fits in memory but may take up to 25s)...');
  console.time('📊 Excel Load Time');
  try {
    const workbook = XLSX.readFile(xlsxFilePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    students = XLSX.utils.sheet_to_json(worksheet);
    console.log(`📈 Successfully loaded ${students.length} student rows directly from Excel!`);
  } catch (err) {
    console.error('❌ Error reading Excel file:', err);
  }
  console.timeEnd('📊 Excel Load Time');
}

loadExcelData();

// Serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));

/**
 * GET /api/search?q=<name_or_seating_no>
 * Returns up to 50 matching students from Excel in-memory cache.
 */
app.get('/api/search', (req, res) => {
  const q = (req.query.q || '').trim();

  if (!q) {
    return res.json({ results: [], query: '' });
  }

  // Determine if the query looks like a seating number (all digits)
  const isNumber = /^\d+$/.test(q);

  let rows = [];
  if (isNumber) {
    // Exact or prefix match on seating_no
    const qStr = q.toLowerCase();
    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      if (student && student.seating_no !== undefined) {
        if (String(student.seating_no).startsWith(qStr)) {
          rows.push(student);
          if (rows.length >= 50) break;
        }
      }
    }
  } else {
    // Arabic name search (contains)
    const matches = [];
    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      if (student && student.arabic_name && student.arabic_name.includes(q)) {
        matches.push(student);
      }
    }
    // Sort by total_degree DESC (similar to database sorting)
    matches.sort((a, b) => (b.total_degree || 0) - (a.total_degree || 0));
    rows = matches.slice(0, 50);
  }

  // Enrich with percentage and pass/fail classification
  const results = rows.map((row) => {
    const degree = row.total_degree ?? null;
    const percentage =
      degree !== null ? ((degree / MAX_GRADE) * 100).toFixed(2) : null;

    let caseClass = 'fail';
    let caseLabel = 'راسب';
    if (row.student_case_desc) {
      if (row.student_case_desc.includes('ناجح')) {
        caseClass = 'pass';
        caseLabel = 'ناجح';
      } else if (row.student_case_desc.includes('دور ثان')) {
        caseClass = 'second';
        caseLabel = 'دور ثانٍ';
      } else if (row.student_case_desc.includes('غياب')) {
        caseClass = 'absent';
        caseLabel = 'غياب';
      }
    }

    return {
      seating_no: row.seating_no,
      arabic_name: row.arabic_name,
      total_degree: degree,
      percentage,
      student_case_desc: row.student_case_desc,
      case_class: caseClass,
      case_label: caseLabel,
    };
  });

  res.json({ results, query: q, max_grade: MAX_GRADE });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
