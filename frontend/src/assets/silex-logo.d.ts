// Vite's "module" import — this becomes a hashed file in dist/client/assets/.
// We don't need a TypeScript module declaration because vite/client already
// provides one for *.png.
declare module "@/assets/silex-logo.png" {
  const src: string;
  export default src;
}
