(function () {
  const TRACKING_KEY = "user_journey_tracking";
  const formStartTimes = {};

  function getJourney() {
    const stored = localStorage.getItem(TRACKING_KEY);
    return stored ? JSON.parse(stored) : null;
  }

  function saveJourney(journey) {
    localStorage.setItem(TRACKING_KEY, JSON.stringify(journey));
  }

  function createNewSession() {
    const referrer = document.referrer;
    console.log("📌 Raw Referrer:", referrer);

    // Check for WhatsApp-specific indicators
    const userAgent = navigator.userAgent;
    const isWhatsAppBrowser =
      userAgent.includes("WhatsApp") || userAgent.includes("WABR");

    console.log("📱 User Agent:", userAgent);
    console.log("🔍 WhatsApp Browser:", isWhatsAppBrowser);

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
      if (!referrer || referrer === "") {
        // Check if opened from WhatsApp app even without referrer
        if (isWhatsAppBrowser) return "whatsapp";
        return "direct";
      }

      // Enhanced WhatsApp detection
      if (
        referrer.includes("whatsapp") ||
        referrer.includes("wa.me") ||
        referrer.includes("chat.whatsapp.com") ||
        referrer.includes("web.whatsapp.com") ||
        referrer.includes("api.whatsapp.com") ||
        isWhatsAppBrowser
      ) {
        return "whatsapp";
      }

      // Other social platforms
      if (referrer.includes("google")) return "google";
      if (referrer.includes("facebook") || referrer.includes("fb.me"))
        return "facebook";
      if (referrer.includes("instagram")) return "instagram";
      if (referrer.includes("linkedin") || referrer.includes("lnkd.in"))
        return "linkedin";
      if (referrer.includes("twitter") || referrer.includes("t.co"))
        return "twitter";
      if (referrer.includes("telegram")) return "telegram";
      if (referrer.includes("bing")) return "bing";
      if (referrer.includes("yahoo")) return "yahoo";
      if (referrer.includes("duckduckgo")) return "duckduckgo";

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

  // Check if this is a new session or existing one
  let journey = getJourney();

  // Only create new session if:
  // 1. No existing journey OR
  // 2. Referrer exists and is different from current domain (new referral source)
  const currentDomain = window.location.hostname.replace("www.", "");
  const referrerDomain = document.referrer
    ? new URL(document.referrer).hostname.replace("www.", "")
    : null;

  const isNewReferralSource =
    document.referrer &&
    referrerDomain &&
    referrerDomain !== currentDomain &&
    journey &&
    journey.attribution.platform !== referrerDomain;

  if (!journey || isNewReferralSource) {
    console.log(
      "🔄 Creating new session:",
      isNewReferralSource ? "New referral source" : "No existing journey"
    );
    journey = createNewSession();
  } else {
    console.log("📋 Continuing existing session");

    // Update current page info for existing session
    journey.pages.currentPage = {
      url: location.href,
      path: location.pathname,
      title: document.title,
      timestamp: new Date().toISOString(),
    };

    // Add to page sequence if not already there
    journey.pages.pageSequence = journey.pages.pageSequence || [];
    if (!journey.pages.pageSequence.includes(location.href)) {
      journey.pages.pageSequence.push(location.href);
    }

    // Increment page views
    journey.engagement.pageViews++;

    saveJourney(journey);
  }

  // Scroll tracking
  let maxScroll = journey.engagement.maxScrollDepth || 0;
  window.addEventListener("scroll", () => {
    const scrollTop = window.scrollY;
    const docHeight = document.body.scrollHeight - window.innerHeight;
    const scrolled =
      docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;
    if (scrolled > maxScroll) {
      maxScroll = scrolled;
      journey.engagement.maxScrollDepth = maxScroll;
      saveJourney(journey);
    }
  });

  // Form tracking
  document.querySelectorAll("form").forEach((form) => {
    const formId = form.id || `form_${Date.now()}`;

    form.addEventListener("focusin", () => {
      journey.engagement.formInteractions++;
      if (!formStartTimes[formId]) {
        formStartTimes[formId] = Date.now();
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
          timeOnFormPage: formStartTimes[formId]
            ? Math.round((now - formStartTimes[formId]) / 1000)
            : 0,
          formFillTime: formStartTimes[formId]
            ? Math.round((now - formStartTimes[formId]) / 1000)
            : 0,
          scrollDepth: journey.engagement.maxScrollDepth,
          pageViews: journey.engagement.pageViews,
          interactions: journey.engagement.formInteractions,
        },
      };

      // Collect form data
      for (const [key, value] of fields.entries()) {
        data.lead[key] = value;
      }

      console.log("🎯 Lead Journey Data (BEFORE clearing storage):", data);

      // Clear storage AFTER logging the data
      localStorage.removeItem(TRACKING_KEY);

      // Reset form start times
      delete formStartTimes[formId];

      // Create new session for next interaction
      journey = createNewSession();

      // Reset form
      form.reset();
    });
  });
})();
