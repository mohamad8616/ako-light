import Header from "./components/header/Header";

export default function HomePage() {
  return (
    <main className="relative h-screen overflow-hidden w-full">
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 h-full w-full object-cover "
      >
        <source src="/hero.mp4" type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-black/50" />

      {/* Hero Content */}
      <div className="md:mt-30 w-full h-3/5 z-50">
        <Header />
      </div>
    </main>
  );
}
