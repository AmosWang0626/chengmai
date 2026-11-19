module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './index.html'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#B93A26',
        // 朱砂：品牌主色（沿用 violet 槽位，全站旧类名自动换肤）
        violet: {
          50: '#FDF3F0', 100: '#FAE4DE', 200: '#F4C8BC', 300: '#EBA493', 400: '#E07A62',
          500: '#D2543C', 600: '#B93A26', 700: '#9A2E1E', 800: '#7C261A', 900: '#652017', 950: '#380E08'
        },
        cinnabar: {
          50: '#FDF3F0', 100: '#FAE4DE', 200: '#F4C8BC', 300: '#EBA493', 400: '#E07A62',
          500: '#D2543C', 600: '#B93A26', 700: '#9A2E1E', 800: '#7C261A', 900: '#652017', 950: '#380E08'
        },
        // 绛紫：辅助深色（沿用 purple 槽位）
        purple: {
          50: '#FBF1F2', 100: '#F6E0E2', 200: '#EDC3C7', 300: '#DF9AA1', 400: '#CC6C76',
          500: '#B44854', 600: '#9C3240', 700: '#822834', 800: '#6B222C', 900: '#591E27', 950: '#300A10'
        },
        // 暖墨中性色（沿用 slate 槽位）：宣纸底 + 墨色字
        slate: {
          50: '#F7F5F0', 100: '#EAE7DF', 200: '#D8D4CA', 300: '#B4B0A5', 400: '#98948A',
          500: '#77736A', 600: '#5D594F', 700: '#46433B', 800: '#2E2C26', 900: '#1D1C17', 950: '#12110D'
        },
        gilt: {
          50: '#FBF6E9', 100: '#F6ECC9', 200: '#EDD99A', 300: '#E3C46B', 400: '#D9AE43',
          500: '#C9972C', 600: '#A87B1F', 700: '#8A6116', 800: '#6E4C12', 900: '#5A3E10'
        },
        jade: {
          50: '#F0F7F2', 100: '#DCEDE2', 200: '#B9DBC6', 300: '#8CC2A3', 400: '#5CA37D',
          500: '#3E8763', 600: '#2F6E50', 700: '#265941', 800: '#1F4735', 900: '#193A2C'
        },
        qing: {
          50: '#EFF6F6', 100: '#D8EAEA', 200: '#B0D5D4', 300: '#7FB8B7', 400: '#4F9A99',
          500: '#357F7E', 600: '#2A6665', 700: '#235251', 800: '#1D4241', 900: '#183635'
        },
        ink: { DEFAULT: '#1D1C17', soft: '#46433B', mute: '#77736A' },
        paper: { DEFAULT: '#F7F5F0', deep: '#EFECE4', card: '#FFFDF8' }
      },
      fontFamily: {
        display: ['"Songti SC"', '"STSong"', '"Noto Serif SC"', '"SimSun"', 'serif'],
        sans: ['-apple-system', 'BlinkMacSystemFont', '"PingFang SC"', '"Hiragino Sans GB"', '"Microsoft YaHei"', 'sans-serif']
      },
      boxShadow: {
        card: '0 1px 2px rgba(29,28,23,.05), 0 10px 28px -18px rgba(29,28,23,.25)',
        lift: '0 2px 6px rgba(29,28,23,.08), 0 18px 44px -20px rgba(29,28,23,.35)'
      }
    }
  },
  plugins: []
};