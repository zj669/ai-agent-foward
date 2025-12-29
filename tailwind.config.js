/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // 页面底色：极淡的灰，几乎接近白，减少屏幕刺眼感
                background: '#F8FAFC', // Slate 50

                // 纸张/卡片背景：纯白，用于承载内容
                paper: '#FFFFFF',

                // 主要文字：深石板灰，比纯黑(#000)更柔和，阅读体验更好
                ink: {
                    900: '#0F172A', // 标题/强调 (Slate 900)
                    700: '#334155', // 正文 (Slate 700)
                    400: '#94A3B8', // 辅助/提示/占位符 (Slate 400)
                },

                // 强调色：电光蓝，仅用于“激活状态”或“连接线”
                accent: {
                    DEFAULT: '#3B82F6', // Blue 500
                    hover: '#2563EB',   // Blue 600
                    light: '#EFF6FF',   // Blue 50 (用于选中态背景)
                },

                // 结构色：用于边框和分割线
                border: '#E2E8F0', // Slate 200
            },
            // 阴影系统：纸质感的关键
            boxShadow: {
                'paper': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
                'float': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
            }
        },
    },
    plugins: [],
}
