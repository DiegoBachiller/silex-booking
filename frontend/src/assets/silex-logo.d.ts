// Vite turns `*.png?url` into a hashed asset URL string.
declare module "@/assets/silex-logo.png?url" {
  const src: string;
  export default src;
}
