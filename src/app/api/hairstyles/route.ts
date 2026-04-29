import { NextRequest, NextResponse } from 'next/server';

// 模拟数据库数据
const hairstylesData = [
  {
    id: 1,
    title: 'Classic Business Cut',
    description: 'Professional men\'s hairstyle',
    category: 'men',
    image: {
      src: '/imgs/showcases/1.jpeg',
      alt: 'Men\'s Business Hairstyle',
    },
  },
  {
    id: 2,
    title: 'Modern Fade',
    description: 'Trendy fade haircut',
    category: 'men',
    image: {
      src: '/imgs/showcases/2.jpeg',
      alt: 'Men\'s Fade Hairstyle',
    },
  },
  {
    id: 3,
    title: 'Long Wavy Hair',
    description: 'Elegant women\'s hairstyle',
    category: 'women',
    image: {
      src: '/imgs/showcases/3.jpeg',
      alt: 'Women\'s Long Wavy Hair',
    },
  },
  // ... 更多数据
];

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const category = searchParams.get('category');

  // 根据分类过滤数据
  let filteredData = hairstylesData;
  if (category && category !== 'all') {
    filteredData = hairstylesData.filter((item) => item.category === category);
  }

  return NextResponse.json({
    success: true,
    data: filteredData,
  });
}
