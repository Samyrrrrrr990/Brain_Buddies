const navToggle = document.querySelector("[data-nav-toggle]");
const navLinks = document.querySelector("[data-nav-links]");
const bookingForm = document.querySelector("[data-booking-form]");
const formStatus = document.querySelector("[data-form-status]");
const yearTarget = document.querySelector("[data-year]");
const cursorDot = document.querySelector("[data-cursor-dot]");
const cursorRing = document.querySelector("[data-cursor-ring]");

const businessEmail = "support@brainbuddies.ca";
const GOOGLE_SHEET_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzSkZd6LJzdk7-J8w-AHonCzLRMiHc4WgxhewEJIsvq1hH4oOPs0HHcE4b7pXdC2D4U/exec";

if (yearTarget) {
  yearTarget.textContent = new Date().getFullYear();
}

if (navToggle && navLinks) {
  navToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  navLinks.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      navLinks.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    }
  });
}

if (cursorDot && cursorRing) {
  const canUseCustomCursor = window.matchMedia("(hover: hover) and (pointer: fine)").matches
    && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (canUseCustomCursor) {
    const root = document.documentElement;
    let cursorX = -100;
    let cursorY = -100;
    let ringX = cursorX;
    let ringY = cursorY;
    let animationFrame = 0;

    const moveCursor = () => {
      ringX += (cursorX - ringX) * 0.24;
      ringY += (cursorY - ringY) * 0.24;
      cursorDot.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0) translate(-50%, -50%)`;
      cursorRing.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;

      if (Math.abs(cursorX - ringX) > 0.2 || Math.abs(cursorY - ringY) > 0.2) {
        animationFrame = requestAnimationFrame(moveCursor);
        return;
      }

      animationFrame = 0;
    };

    const setCursorMode = (target) => {
      const element = target instanceof Element ? target : null;
      const isPointer = Boolean(element?.closest("a, button, summary, label, .button, .nav-toggle"));
      const isTyping = Boolean(element?.closest("input:not([type='radio']):not([type='checkbox']), textarea, select"));
      root.classList.toggle("cursor-pointer", isPointer);
      root.classList.toggle("cursor-typing", isTyping);
    };

    root.classList.add("has-custom-cursor", "cursor-hidden");

    window.addEventListener("pointermove", (event) => {
      cursorX = event.clientX;
      cursorY = event.clientY;
      root.classList.remove("cursor-hidden");
      setCursorMode(event.target);

      if (!animationFrame) {
        animationFrame = requestAnimationFrame(moveCursor);
      }
    }, { passive: true });

    document.addEventListener("pointerover", (event) => {
      setCursorMode(event.target);
    });

    document.addEventListener("pointerleave", () => {
      root.classList.add("cursor-hidden");
    });

    window.addEventListener("blur", () => {
      root.classList.add("cursor-hidden");
    });
  }
}

if (bookingForm && formStatus) {
  const submitButton = bookingForm.querySelector("[type='submit']");
  const originalSubmitText = submitButton?.textContent || "Send tutoring request";

  const showFormStatus = (title, message, options = {}) => {
    formStatus.classList.add("is-visible");
    formStatus.classList.toggle("is-error", Boolean(options.isError));
    formStatus.innerHTML = `
      <strong>${title}</strong>
      <p>${message}</p>
      ${options.link ? `<a href="${options.link.href}">${options.link.label}</a>` : ""}
    `;
  };

  const buildMailto = (payload) => {
    const subjectLine = encodeURIComponent(`Tutoring request for ${payload.studentName}`);
    const body = encodeURIComponent(
      [
        "Hi Brain Buddies,",
        "",
        "I would like to ask about tutoring.",
        "",
        `Student name: ${payload.studentName}`,
        `Email: ${payload.email}`,
        `Grade: ${payload.grade}`,
        `Subject: ${payload.subject}`,
        `Preferred format: ${payload.format}`,
        `City/neighbourhood: ${payload.location || "Not provided"}`,
        `Goal: ${payload.goal || "Not provided"}`,
        "",
        "Thank you."
      ].join("\n")
    );

    return `mailto:${businessEmail}?subject=${subjectLine}&body=${body}`;
  };

  const verifyLeadInSheet = (requestId) => new Promise((resolve, reject) => {
    const callbackName = `brainBuddiesLead_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const endpoint = new URL(GOOGLE_SHEET_WEB_APP_URL);
    const script = document.createElement("script");
    let settled = false;

    const cleanup = () => {
      delete window[callbackName];
      script.remove();
    };

    const timer = window.setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      reject(new Error("Timed out waiting for Google Sheets verification"));
    }, 12000);

    window[callbackName] = (response) => {
      if (settled) {
        return;
      }

      settled = true;
      window.clearTimeout(timer);
      cleanup();

      if (response && response.ok) {
        resolve(response);
        return;
      }

      reject(new Error("Google Sheets did not verify the saved row"));
    };

    endpoint.searchParams.set("action", "verify");
    endpoint.searchParams.set("callback", callbackName);
    endpoint.searchParams.set("requestId", requestId);
    endpoint.searchParams.set("_", String(Date.now()));

    script.src = endpoint.toString();
    script.async = true;
    script.onerror = () => {
      if (settled) {
        return;
      }

      settled = true;
      window.clearTimeout(timer);
      cleanup();
      reject(new Error("Could not load Google Sheets endpoint"));
    };

    document.body.append(script);
  });

  const submitLeadToSheet = async (payload) => {
    await fetch(GOOGLE_SHEET_WEB_APP_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload)
    });

    await verifyLeadInSheet(payload.requestId);
  };

  bookingForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!bookingForm.reportValidity()) {
      return;
    }

    const data = new FormData(bookingForm);
    const spamTrap = String(data.get("website") || "").trim();

    if (spamTrap) {
      bookingForm.reset();
      return;
    }

    const studentName = String(data.get("studentName") || "").trim();
    const email = String(data.get("email") || "").trim();
    const grade = String(data.get("grade") || "").trim();
    const subject = String(data.get("subject") || "").trim();
    const format = String(data.get("format") || "").trim();
    const location = String(data.get("location") || "").trim();
    const goal = String(data.get("goal") || "").trim();

    const payload = {
      requestId: `bb-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: new Date().toISOString(),
      studentName,
      email,
      grade,
      subject,
      format,
      location,
      goal,
      pageUrl: window.location.href,
      userAgent: navigator.userAgent
    };

    const mailto = buildMailto(payload);

    if (!GOOGLE_SHEET_WEB_APP_URL) {
      showFormStatus(
        "Almost connected.",
        "The Google Sheet is ready, but the Apps Script web app URL still needs to be pasted into the site before submissions can be saved automatically.",
        {
          isError: true,
          link: {
            href: mailto,
            label: "Use email instead"
          }
        }
      );
      return;
    }

    try {
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Sending request...";
      }

      await submitLeadToSheet(payload);

      bookingForm.reset();
      showFormStatus(
        "Request saved.",
        "Thanks. Brain Buddies has your details in the tutoring list and will follow up with availability and next steps."
      );
    } catch (error) {
      showFormStatus(
        "Could not save the request.",
        "The Google Sheet did not confirm the save. The Apps Script deployment may need to be updated. Please open the email draft so Brain Buddies can still follow up.",
        {
          isError: true,
          link: {
            href: mailto,
            label: "Open email draft"
          }
        }
      );
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalSubmitText;
      }
    }
  });
}
