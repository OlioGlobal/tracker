(function () {
  const TRACKING_KEY = "user_journey_tracking";
  const formStartTimes = {};

  function getJourney() {
    const stored = localStorage.getItem(TRACKING_KEY);
    return stored ? JSON.parse(stored) : createNewSession();
  }

  function saveJourney(journey) {
    localStorage.setItem(TRACKING_KEY, JSON.stringify(journey));
  }

  function createNewSession() {
    const referrer = document.referrer;
    console.log("📌 Raw Referrer:", referrer);

    const currentUrl = new URL(window.location.href);
    const utm = {
      utmSource: currentUrl.searchParams.get("utm_source") || "",
      utmMedium: currentUrl.searchParams.get("utm_medium") || "",
      utmCampaign: currentUrl.searchParams.get("utm_campaign") || "",
      utmTerm: currentUrl.searchParams.get("utm_term") || "",
      utmContent: currentUrl.searchParams.get("utm_content") || "",
    };

    const getDomain = (url) => {
      try {
        return new URL(url).hostname.replace("www.", "");
      } catch {
        return "direct";
      }
    };

    const getSource = () => {
      if (!referrer || referrer === "") return "direct";
      if (referrer.includes("google")) return "google";
      if (referrer.includes("facebook")) return "facebook";
      if (referrer.includes("instagram")) return "instagram";
      if (referrer.includes("linkedin")) return "linkedin";
      if (referrer.includes("whatsapp")) return "whatsapp";
      if (referrer.includes("bing")) return "bing";
      return getDomain(referrer);
    };

    const journey = {
      session: {
        sessionId:
          "sess_" + Date.now() + "_" + Math.random().toString(36).slice(2),
        startTime: Date.now(),
        userAgent: navigator.userAgent,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      attribution: {
        ...utm,
        referrerUrl: referrer || "direct",
        source: utm.utmSource || getSource(),
        medium: utm.utmMedium || (referrer ? "referral" : "direct"),
        campaign: utm.utmCampaign || "default",
        platform: referrer ? getDomain(referrer) : "direct",
        category: utm.utmMedium ? "UTM" : referrer ? "Referral" : "Direct",
      },
      pages: {
        referrerPage: referrer || "direct",
        landingPage: {
          url: window.location.href,
          path: location.pathname,
          title: document.title,
          timestamp: new Date().toISOString(),
        },
        currentPage: {
          url: window.location.href,
          path: location.pathname,
          title: document.title,
          timestamp: new Date().toISOString(),
        },
        pageSequence: [window.location.href],
      },
      technical: {
        device: /mobile/i.test(navigator.userAgent) ? "Mobile" : "Desktop",
        browser: navigator.userAgent.includes("Chrome")
          ? "Chrome"
          : navigator.userAgent.includes("Firefox")
          ? "Firefox"
          : navigator.userAgent.includes("Safari")
          ? "Safari"
          : "Other",
        os: navigator.userAgent.includes("Windows")
          ? "Windows"
          : navigator.userAgent.includes("Mac")
          ? "macOS"
          : navigator.userAgent.includes("Linux")
          ? "Linux"
          : "Other",
        screenResolution: `${screen.width}x${screen.height}`,
        viewportSize: `${window.innerWidth}x${window.innerHeight}`,
        connectionType: navigator.connection?.effectiveType || "unknown",
      },
      engagement: {
        pageViews: 1,
        maxScrollDepth: 0,
        formInteractions: 0,
      },
    };

    saveJourney(journey);
    return journey;
  }

  let journey = getJourney();

  journey.pages.currentPage = {
    url: location.href,
    path: location.pathname,
    title: document.title,
    timestamp: new Date().toISOString(),
  };

  journey.pages.pageSequence = journey.pages.pageSequence || [];
  if (!journey.pages.pageSequence.includes(location.href)) {
    journey.pages.pageSequence.push(location.href);
  }

  journey.engagement.pageViews++;

  saveJourney(journey);

  let maxScroll = 0;
  window.addEventListener("scroll", () => {
    const scrollTop = window.scrollY;
    const docHeight = document.body.scrollHeight - window.innerHeight;
    const scrolled = Math.round((scrollTop / docHeight) * 100);
    if (scrolled > maxScroll) {
      maxScroll = scrolled;
      journey.engagement.maxScrollDepth = maxScroll;
      saveJourney(journey);
    }
  });

  document.querySelectorAll("form").forEach((form) => {
    form.addEventListener("focusin", () => {
      journey.engagement.formInteractions++;
      if (!formStartTimes[form.id]) {
        formStartTimes[form.id] = Date.now();
      }
      saveJourney(journey);
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const fields = new FormData(form);
      const now = Date.now();

      const data = {
        lead: {},
        attribution: journey.attribution,
        session: {
          sessionId: journey.session.sessionId,
          sessionDuration: Math.round((now - journey.session.startTime) / 1000),
          timezone: journey.session.timezone,
          language: journey.session.language,
        },
        technical: journey.technical,
        journey: {
          referrerPage: journey.pages.referrerPage,
          landingPage: journey.pages.landingPage,
          formPage: journey.pages.currentPage,
          pageSequence: journey.pages.pageSequence,
          totalPages: journey.pages.pageSequence.length,
        },
        engagement: {
          timeOnSite: Math.round((now - journey.session.startTime) / 1000),
          timeOnFormPage: formStartTimes[form.id]
            ? Math.round((now - formStartTimes[form.id]) / 1000)
            : 0,
          formFillTime: formStartTimes[form.id]
            ? Math.round((now - formStartTimes[form.id]) / 1000)
            : 0,
          scrollDepth: journey.engagement.maxScrollDepth,
          pageViews: journey.engagement.pageViews,
          interactions: journey.engagement.formInteractions,
        },
      };

      for (const [key, value] of fields.entries()) {
        data.lead[key] = value;
      }

      console.log("🎯 Lead Journey Data", data);

      localStorage.removeItem(TRACKING_KEY);

      journey = createNewSession();

      form.reset();
    });
  });
})();
