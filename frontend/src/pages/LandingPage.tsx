import React from 'react';
import Header from '../components/landing/Header';
import Hero from '../components/landing/Hero';
import Features from '../components/landing/Features';
import Pricing from '../components/landing/Pricing';
import Hardware from '../components/landing/Hardware';
import Footer from '../components/landing/Footer';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-[#0A0D14] text-white selection:bg-blue-500/30 font-sans overflow-x-hidden">
      <Header />
      <main>
        <Hero />
        <Features />
        <Pricing />
        <Hardware />
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;
