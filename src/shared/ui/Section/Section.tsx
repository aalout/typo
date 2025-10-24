import { ReactNode } from "react";

type SectionProps = {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  ariaLabel?: string;
};

const Section = ({ title, actions, children, ariaLabel }: SectionProps) => {
  return (
    <div className="panel" aria-label={ariaLabel || title} tabIndex={0}>
      {(title || actions) && (
        <div className="row" style={{ justifyContent: "space-between" }}>
          {title ? <strong>{title}</strong> : <span />}
          {actions ? <div className="actions">{actions}</div> : null}
        </div>
      )}
      {children}
    </div>
  );
};

export default Section;
