const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'bookleaf_sample_data.json'), 'utf8'));
const outDir = path.join(__dirname, '..');

// 1. Authors CSV
// Columns: author_id, name, email, phone, city, joined_date
let authorsCsv = 'author_id,name,email,phone,city,joined_date\n';
for (const a of data.authors) {
  authorsCsv += `"${a.author_id}","${a.name}","${a.email}","${a.phone}","${a.city}","${a.joined_date}"\n`;
}
fs.writeFileSync(path.join(outDir, 'authors_for_bubble.csv'), authorsCsv);

// 2. Books CSV
// Columns: book_id, author_id, title, isbn, genre, publication_date, status, mrp, author_royalty_per_copy, total_copies_sold, total_royalty_earned, royalty_paid, royalty_pending, last_royalty_payout_date, print_partner, available_on
let booksCsv = 'book_id,author_id,title,isbn,genre,publication_date,status,mrp,author_royalty_per_copy,total_copies_sold,total_royalty_earned,royalty_paid,royalty_pending,last_royalty_payout_date,print_partner,available_on\n';
for (const a of data.authors) {
  for (const b of a.books) {
    const pubDate = b.publication_date || '';
    const lastPayout = b.last_royalty_payout_date || '';
    const availableOn = (b.available_on || []).join(', ');
    booksCsv += `"${b.book_id}","${a.author_id}","${b.title}","${b.isbn}","${b.genre}","${pubDate}","${b.status}",${b.mrp || 0},${b.author_royalty_per_copy || 0},${b.total_copies_sold || 0},${b.total_royalty_earned || 0},${b.royalty_paid || 0},${b.royalty_pending || 0},"${lastPayout}","${b.print_partner || ''}","${availableOn}"\n`;
  }
}
fs.writeFileSync(path.join(outDir, 'books_for_bubble.csv'), booksCsv);

// 3. Users CSV
// Admin + 10 Authors
let usersCsv = 'email,role,author_id,name\n';
usersCsv += `"admin@bookleaf.com","Admin","","Admin User"\n`;
for (const a of data.authors) {
  usersCsv += `"${a.email}","Author","${a.author_id}","${a.name}"\n`;
}
fs.writeFileSync(path.join(outDir, 'users_for_bubble.csv'), usersCsv);

console.log('Successfully created authors_for_bubble.csv, books_for_bubble.csv, and users_for_bubble.csv!');
