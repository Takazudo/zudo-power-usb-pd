import type { ReactNode } from 'react';
import clsx from 'clsx';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import DocsSitemap from '@site/src/components/DocsSitemap';
import styles from './index.module.css';

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout title={siteConfig.title}>
      <main className={clsx(styles.main)}>
        <div className={styles.twoColLayout}>
          {/* Left Column - Fixed width, scroll-fixed */}
          <aside className={styles.leftCol}>
            <div className={styles.leftColContent}>
              {/* Title and Logo Section */}
              <div className={styles.headerSection}>
                <h1>{siteConfig.title}</h1>
                <p className={styles.tagline}>{siteConfig.tagline}</p>

                {/* Big Logo */}
                <div className={styles.logoContainer}>
                  <img
                    src="/img/logo.svg"
                    alt="USB-PD Synth Power Logo"
                    className={styles.bigLogo}
                  />
                </div>
              </div>

              {/* Quick Links */}
              <section className={styles.linksSection}>
                <h2>Related Links</h2>
                <ul className={styles.linksList}>
                  <li>
                    <a
                      href="https://github.com/takazudo/zudo-power-usb-pd"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      GitHub Repository
                    </a>
                  </li>
                  <li>
                    <a href="https://www.jlcpcb.com/" target="_blank" rel="noopener noreferrer">
                      JLCPCB
                    </a>
                  </li>
                </ul>
              </section>

              {/* Stats Section */}
              <section className={styles.statsSection}>
                <h2>Specifications</h2>
                <div className={styles.statsGrid}>
                  <div className={styles.statItem}>
                    <div className={styles.statNumber}>15V</div>
                    <div className={styles.statLabel}>USB-PD Input</div>
                  </div>
                  <div className={styles.statItem}>
                    <div className={styles.statNumber}>±12V</div>
                    <div className={styles.statLabel}>Output Voltage</div>
                  </div>
                  <div className={styles.statItem}>
                    <div className={styles.statNumber}>+5V</div>
                    <div className={styles.statLabel}>Auxiliary Power</div>
                  </div>
                  <div className={styles.statItem}>
                    <div className={styles.statNumber}>2A</div>
                    <div className={styles.statLabel}>Total Current</div>
                  </div>
                </div>
              </section>
            </div>
          </aside>

          {/* Right Column - Remaining space */}
          <div className={styles.rightCol}>
            {/* Full Documentation Sitemap */}
            <DocsSitemap />
          </div>
        </div>
      </main>
    </Layout>
  );
}
