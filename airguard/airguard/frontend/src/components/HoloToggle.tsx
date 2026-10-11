import { useId } from 'react';
import './HoloToggle.css';

interface HoloToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

export const HoloToggle: React.FC<HoloToggleProps> = ({ checked, onChange, label }) => {
  const id = useId();

  return (
    <div className="holo-toggle" title={label}>
      <div className="holo-toggle__wrap">
        <input
          className="holo-toggle__input"
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          aria-label={label}
        />
        <label className="holo-toggle__track" htmlFor={id}>
          <span className="holo-toggle__track-lines"><span /></span>
          <span className="holo-toggle__thumb">
            <span className="holo-toggle__core" />
            <span className="holo-toggle__inner" />
            <span className="holo-toggle__scan" />
            <span className="holo-toggle__particles">
              <span /><span /><span /><span /><span />
            </span>
          </span>
          <span className="holo-toggle__data">
            <span className="holo-toggle__text holo-toggle__text--off">OFF</span>
            <span className="holo-toggle__text holo-toggle__text--on">ON</span>
            <span className="holo-toggle__status holo-toggle__status--off" />
            <span className="holo-toggle__status holo-toggle__status--on" />
          </span>
          <span className="holo-toggle__rings"><span /><span /><span /></span>
          <span className="holo-toggle__interface"><span /><span /><span /><span /><span /><span /></span>
          <span className="holo-toggle__reflection" />
          <span className="holo-toggle__glow" />
        </label>
      </div>
    </div>
  );
};
