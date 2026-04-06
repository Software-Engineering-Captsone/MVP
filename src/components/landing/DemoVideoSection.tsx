function normalizeEmbedUrl(input: string): string {
  const t = input.trim();
  if (t.includes("youtube.com/embed/")) return t;
  const yt = t.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s?]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  if (t.includes("player.vimeo.com")) return t;
  const vm = t.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return t;
}

export default function DemoVideoSection() {
  const embedRaw = process.env.NEXT_PUBLIC_DEMO_VIDEO_EMBED_URL?.trim();
  const fileUrl = process.env.NEXT_PUBLIC_DEMO_VIDEO_URL?.trim();
  const poster = process.env.NEXT_PUBLIC_DEMO_VIDEO_POSTER_URL?.trim();

  const embed = embedRaw ? normalizeEmbedUrl(embedRaw) : "";

  return (
    <div className="landing-demo-video">
      <div className="landing-demo-video__frame">
        {embed ? (
          <iframe
            title="NILINK product demo"
            src={embed}
            className="landing-demo-video__media"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : fileUrl ? (
          <video
            className="landing-demo-video__media"
            controls
            playsInline
            preload="metadata"
            poster={poster || undefined}
          >
            <source src={fileUrl} />
            Your browser does not support embedded video.
          </video>
        ) : (
          <div className="landing-demo-video__placeholder" role="img" aria-label="Demo video placeholder">
            <div className="landing-demo-video__placeholder-inner">
              <span className="landing-demo-video__play" aria-hidden>
                <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
                  <circle cx="28" cy="28" r="28" fill="rgba(255,255,255,0.12)" />
                  <path
                    d="M23 18.5L38 28L23 37.5V18.5Z"
                    fill="white"
                    fillOpacity="0.95"
                  />
                </svg>
              </span>
              <p className="landing-demo-video__placeholder-title">Demo video</p>
              <p className="landing-demo-video__placeholder-sub">
                Add your recording by setting an environment variable in{" "}
                <code className="landing-demo-video__code">.env.local</code>
              </p>
            </div>
          </div>
        )}
      </div>
      {!embed && !fileUrl ? (
        <p className="landing-demo-video__config-hint">
          Use{" "}
          <code className="landing-demo-video__code">NEXT_PUBLIC_DEMO_VIDEO_EMBED_URL</code>{" "}
          (YouTube, Vimeo, or Loom embed) or{" "}
          <code className="landing-demo-video__code">NEXT_PUBLIC_DEMO_VIDEO_URL</code>{" "}
          (direct MP4 URL after you upload to storage).
        </p>
      ) : null}
    </div>
  );
}
