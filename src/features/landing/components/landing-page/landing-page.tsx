import "@fontsource-variable/archivo/wdth.css";
import { Link } from "@tanstack/react-router";
import { ThemeToggle } from "@/features/theme/components/theme-toggle/theme-toggle";
import {
  couple,
  features,
  footer,
  goals,
  settle,
  split,
  statement,
} from "@/features/landing/content";
import { SeamLink } from "@/features/landing/components/seam-link/seam-link";
import { SplitStage } from "@/features/landing/components/split-stage/split-stage";
import styles from "@/features/landing/components/landing-page/landing-page.module.css";

export function LandingPage() {
  return (
    <div className={styles.page}>
      <a className={styles.skip} href="#conteudo">
        Pular para o conteúdo
      </a>
      <header className={styles.header}>
        <Link to="/conheca" className={styles.wordmark}>
          twogether<span className={styles.dot}>.</span>
        </Link>
        <nav className={styles.nav} aria-label="Página">
          <a className={styles.navLink} href="#dividir">
            Como divide
          </a>
          <a className={styles.navLink} href="#metas">
            Metas
          </a>
          <SeamLink to="/entrar" variant="outline">
            Entrar
          </SeamLink>
        </nav>
      </header>

      <main id="conteudo" tabIndex={-1} className={styles.main}>
        <SplitStage />

        <p className={styles.statement}>{statement}</p>

        <section
          id="dividir"
          className={styles.settle}
          aria-labelledby="dividir-title"
        >
          <div className={styles.settleAside}>
            <h2 id="dividir-title" className={styles.settleTitle}>
              {settle.title}
            </h2>
            <SettleTicket />
          </div>
          <ol className={styles.steps}>
            {settle.steps.map((step, index) => (
              <li key={step.title} className={styles.step}>
                <span className={styles.stepNumber} aria-hidden="true">
                  {index + 1}
                </span>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepText}>{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section
          id="metas"
          className={styles.goals}
          aria-labelledby="metas-title"
        >
          <div className={styles.goalsHead}>
            <h2 id="metas-title" className={styles.sectionTitle}>
              {goals.title}
            </h2>
            <p className={styles.goalsIntro}>{goals.intro}</p>
          </div>
          <div className={styles.bar} aria-hidden="true">
            {goals.bands.map((band, index) => (
              <span
                key={band.id}
                className={styles.band}
                style={{
                  flexGrow: band.percent,
                  "--band": band.color,
                  "--band-start": `${12 + index * 7}%`,
                  "--band-end": `${40 + index * 7}%`,
                }}
              />
            ))}
          </div>
          <p className={styles.example}>{goals.example}</p>
          <ul className={styles.legend}>
            {goals.bands.map((band) => (
              <li
                key={band.id}
                className={styles.legendItem}
                style={{ "--band": band.color }}
              >
                <span className={styles.legendPercent}>{band.percent}%</span>
                <span className={styles.legendName}>{band.name}</span>
                <span className={styles.legendPlanned}>R$ {band.planned}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.features} aria-labelledby="resto-title">
          <h2 id="resto-title" className={styles.sectionTitle}>
            {features.title}
          </h2>
          <dl className={styles.rows}>
            {features.rows.map((row) => (
              <div key={row.name} className={styles.row}>
                <dt className={styles.rowName}>{row.name}</dt>
                <dd className={styles.rowText}>{row.text}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.finale}>
          <h2 className={styles.finaleTitle}>{footer.title}</h2>
          <div className={styles.finaleActions}>
            <SeamLink to="/entrar">{footer.cta}</SeamLink>
            <Link to="/entrar" className={styles.quietLink}>
              {footer.signIn}
            </Link>
          </div>
        </div>
        <div className={styles.mend} aria-hidden="true">
          <span className={`${styles.mendPiece} ${styles.mendLeft}`}>
            twogether.
          </span>
          <span className={`${styles.mendPiece} ${styles.mendRight}`}>
            twogether.
          </span>
          <span className={styles.mendSeam} />
        </div>
        <div className={styles.colophon}>
          <span>{footer.tagline}</span>
          <ThemeToggle />
        </div>
      </footer>
    </div>
  );
}

// The grocery receipt from the hero, kept beside the steps. Each step that
// scrolls past moves its status on; the steps say the same thing in text.
function SettleTicket() {
  const [splitStatus, openStatus, paidStatus] = settle.status;

  return (
    <div className={styles.ticket} aria-hidden="true">
      <div className={styles.ticketHead}>
        <span>{split.label}</span>
        <span className={styles.ticketTotal}>R$ {split.total}</span>
      </div>
      <div className={styles.ticketSplit}>
        <span className={styles.ticketHalf}>
          <span className={styles.ticketWho}>{couple.payer}</span>R${" "}
          {split.kept}
        </span>
        <span className={styles.ticketHalf}>
          <span className={styles.ticketWho}>{couple.partner}</span>R${" "}
          {split.half}
        </span>
      </div>
      <div className={styles.ticketStatus}>
        <span>{splitStatus}</span>
        <span className={styles.statusOpen}>{openStatus}</span>
        <span className={styles.statusPaid}>{paidStatus}</span>
      </div>
    </div>
  );
}
