import { GlobalNav } from './components/GlobalNav';
import { LocalNav } from './components/LocalNav';
import { Hero } from './components/Hero';
import { Highlights } from './components/Highlights';
import { Design } from './components/Design';
import { ProductViewer } from './components/ProductViewer';
import { Display } from './components/Display';
import { Versatility } from './components/Versatility';
import { Cameras } from './components/Cameras';
import { Performance } from './components/Performance';
import { SharedFeatures } from './components/SharedFeatures';
import { Accessories } from './components/Accessories';
import { Incentives } from './components/Incentives';
import { CompareTable } from './components/CompareTable';
import { EnvironmentAndValues } from './components/EnvironmentAndValues';
import { Faq } from './components/Faq';
import { Footer } from './components/Footer';
import { useRevealOnScroll } from './hooks/useRevealOnScroll';
import { useScrollPast } from './hooks/useScrollPast';

/** 产品导航出现的滚动阈值：约等于首屏高度减去导航。 */
const LOCALNAV_THRESHOLD = 620;

export default function App() {
  useRevealOnScroll();
  const showLocalNav = useScrollPast(LOCALNAV_THRESHOLD);

  return (
    <>
      <GlobalNav />
      <LocalNav visible={showLocalNav} />
      <main id="main">
        <Hero />
        <Highlights />
        <Design />
        <ProductViewer />
        <Display />
        <Versatility />
        <Cameras />
        <Performance />
        <SharedFeatures />
        <Accessories />
        <Incentives />
        <CompareTable />
        <EnvironmentAndValues />
        <Faq />
      </main>
      <Footer />
    </>
  );
}
