const config = {
  plugins: {
    "@tailwindcss/postcss": {},
    // 67차: 화면 크기 미디어쿼리·vh/vw를 "가상(눕힌) 화면"용으로 한 벌 더 만들어요. <html data-rot-lock>이 없으면 아무 영향이 없어요.
    "./postcss/rotLockMedia.cjs": {},
  },
};

export default config;
