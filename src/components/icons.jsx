function Icon({ paths, size = 15 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths}
    </svg>
  );
}

export const IconBoard = () => (
  <Icon
    paths={
      <>
        <rect x="3" y="3" width="4.5" height="14" rx="1" />
        <rect x="8.75" y="3" width="4.5" height="9" rx="1" />
        <rect x="14.5" y="3" width="4.5" height="6" rx="1" />
      </>
    }
  />
);

export const IconList = () => (
  <Icon
    paths={
      <>
        <line x1="3" y1="5" x2="17" y2="5" />
        <line x1="3" y1="10" x2="17" y2="10" />
        <line x1="3" y1="15" x2="17" y2="15" />
      </>
    }
  />
);

export const IconChart = () => (
  <Icon
    paths={
      <>
        <line x1="3" y1="17" x2="17" y2="17" />
        <rect x="5" y="10" width="3" height="7" />
        <rect x="9.5" y="6" width="3" height="11" />
        <rect x="14" y="12" width="3" height="5" />
      </>
    }
  />
);

export const IconGear = () => (
  <Icon
    paths={
      <>
        <circle cx="10" cy="10" r="2.6" />
        <path d="M10 3.5v1.6M10 14.9v1.6M16.5 10h-1.6M5.1 10H3.5M14.6 5.4l-1.1 1.1M6.5 13.5l-1.1 1.1M14.6 14.6l-1.1-1.1M6.5 6.5L5.4 5.4" />
      </>
    }
  />
);

export const IconSearch = () => (
  <Icon
    size={14}
    paths={
      <>
        <circle cx="8.5" cy="8.5" r="5" />
        <line x1="16.5" y1="16.5" x2="12.4" y2="12.4" />
      </>
    }
  />
);

export const IconDots = () => (
  <Icon
    size={14}
    paths={
      <>
        <circle cx="10" cy="4.5" r="1" />
        <circle cx="10" cy="10" r="1" />
        <circle cx="10" cy="15.5" r="1" />
      </>
    }
  />
);

export const IconChevron = () => (
  <Icon size={13} paths={<path d="M6 8l4 4 4-4" />} />
);

export const IconSignOut = () => (
  <Icon
    size={13}
    paths={
      <>
        <path d="M8 4H4.5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1H8" />
        <path d="M13 14l4-4-4-4" />
        <line x1="17" y1="10" x2="7.5" y2="10" />
      </>
    }
  />
);
