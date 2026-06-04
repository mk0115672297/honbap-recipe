const fs = require('fs');
const path = 'src/App.jsx';
let c = fs.readFileSync(path, 'utf8');

// CATEGORY_IMG 추가
const imgMap = `
const CATEGORY_IMG = {
  '한식': 'https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg',
  '국/찌개': 'https://images.pexels.com/photos/3622608/pexels-photo-3622608.jpeg',
  '볶음': 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg',
  '양식': 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg',
  '일식': 'https://images.pexels.com/photos/2098085/pexels-photo-2098085.jpeg',
  '중식': 'https://images.pexels.com/photos/3184183/pexels-photo-3184183.jpeg',
  '샐러드': 'https://images.pexels.com/photos/1640774/pexels-photo-1640774.jpeg',
  '간식': 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg',
};`;

// CATEGORY_IMG 이미 없을 때만 추가
if (!c.includes('CATEGORY_IMG')) {
  c = c.replace('const DIFFICULTY_COLOR', imgMap + '\n\nconst DIFFICULTY_COLOR');
  console.log('CATEGORY_IMG 추가됨');
} else {
  console.log('CATEGORY_IMG 이미 존재');
}

// 이미지 src 교체 - unsplash/pexels 동적 URL 제거하고 고정으로
const oldImg1 = /src=\{`https:\/\/source\.unsplash\.com[^`]+`\}/g;
const oldImg2 = /src=\{`https:\/\/images\.pexels\.com[^`]+`\}/g;
const newSrc = "src={(CATEGORY_IMG[recipe.category] || CATEGORY_IMG['한식']) + '?auto=compress&cs=tinysrgb&w=300&h=200&fit=crop'}";

const count1 = (c.match(oldImg1) || []).length;
const count2 = (c.match(oldImg2) || []).length;
console.log('unsplash 패턴:', count1, '개');
console.log('pexels 패턴:', count2, '개');

c = c.replace(oldImg1, newSrc);
c = c.replace(oldImg2, newSrc);

fs.writeFileSync(path, c, 'utf8');
console.log('완료!');
