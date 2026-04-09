document.addEventListener("DOMContentLoaded", () => {
  // Core DOM elements
  const activitiesList = document.getElementById("activities-list");
  const messageDiv = document.getElementById("message");

  // Registration modal elements
  const registrationModal = document.getElementById("registration-modal");
  const modalActivityName = document.getElementById("modal-activity-name");
  const signupForm = document.getElementById("signup-form");
  const activityInput = document.getElementById("activity");
  const closeRegistrationModal = document.querySelector(".close-modal");

  // Search and filter elements
  const searchInput = document.getElementById("activity-search");
  const searchButton = document.getElementById("search-button");
  const categoryFilters = document.querySelectorAll(".category-filter");
  const dayFilters = document.querySelectorAll(".day-filter");
  const timeFilters = document.querySelectorAll(".time-filter");

  // Authentication elements
  const loginButton = document.getElementById("login-button");
  const userInfo = document.getElementById("user-info");
  const displayName = document.getElementById("display-name");
  const logoutButton = document.getElementById("logout-button");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const closeLoginModal = document.querySelector(".close-login-modal");
  const loginMessage = document.getElementById("login-message");

  // Announcement elements
  const announcementItems = document.getElementById("announcement-items");
  const manageAnnouncementsButton = document.getElementById(
    "manage-announcements-button"
  );
  const announcementsModal = document.getElementById("announcements-modal");
  const closeAnnouncementsModal = document.querySelector(
    ".close-announcements-modal"
  );
  const announcementForm = document.getElementById("announcement-form");
  const announcementIdInput = document.getElementById("announcement-id");
  const announcementMessageInput = document.getElementById("announcement-message");
  const announcementStartDateInput = document.getElementById(
    "announcement-start-date"
  );
  const announcementExpirationInput = document.getElementById(
    "announcement-expiration-date"
  );
  const announcementSubmitButton = document.getElementById(
    "announcement-submit-button"
  );
  const announcementCancelEdit = document.getElementById("announcement-cancel-edit");
  const announcementAdminMessage = document.getElementById(
    "announcement-admin-message"
  );
  const announcementAdminList = document.getElementById("announcement-admin-list");

  // Activity categories with corresponding colors
  const activityTypes = {
    sports: { label: "Sports", color: "#e8f5e9", textColor: "#2e7d32" },
    arts: { label: "Arts", color: "#fff3e0", textColor: "#b34700" },
    academic: { label: "Academic", color: "#e3f2fd", textColor: "#1565c0" },
    community: { label: "Community", color: "#f1f8e9", textColor: "#33691e" },
    technology: { label: "Technology", color: "#e8eaf6", textColor: "#3949ab" },
  };

  // State
  let allActivities = {};
  let currentFilter = "all";
  let searchQuery = "";
  let currentDay = "";
  let currentTimeRange = "";
  let currentUser = null;
  let managedAnnouncements = [];

  const timeRanges = {
    morning: { start: "06:00", end: "08:00" },
    afternoon: { start: "15:00", end: "18:00" },
    weekend: { days: ["Saturday", "Sunday"] },
  };

  function initializeFilters() {
    const activeDayFilter = document.querySelector(".day-filter.active");
    if (activeDayFilter) {
      currentDay = activeDayFilter.dataset.day;
    }

    const activeTimeFilter = document.querySelector(".time-filter.active");
    if (activeTimeFilter) {
      currentTimeRange = activeTimeFilter.dataset.time;
    }
  }

  function updateAuthBodyClass() {
    if (currentUser) {
      document.body.classList.remove("not-authenticated");
    } else {
      document.body.classList.add("not-authenticated");
    }
  }

  function updateAuthUI() {
    if (currentUser) {
      loginButton.classList.add("hidden");
      userInfo.classList.remove("hidden");
      displayName.textContent = currentUser.display_name;
      manageAnnouncementsButton.classList.remove("hidden");
    } else {
      loginButton.classList.remove("hidden");
      userInfo.classList.add("hidden");
      displayName.textContent = "";
      manageAnnouncementsButton.classList.add("hidden");
      closeAnnouncementsModalHandler();
    }

    updateAuthBodyClass();
    fetchActivities();
  }

  function checkAuthentication() {
    const savedUser = localStorage.getItem("currentUser");
    if (savedUser) {
      try {
        currentUser = JSON.parse(savedUser);
        updateAuthUI();
        validateUserSession(currentUser.username);
      } catch (error) {
        console.error("Error parsing saved user", error);
        logout();
      }
    } else {
      updateAuthUI();
    }

    updateAuthBodyClass();
  }

  async function validateUserSession(username) {
    try {
      const response = await fetch(
        `/auth/check-session?username=${encodeURIComponent(username)}`
      );

      if (!response.ok) {
        logout();
        return;
      }

      const userData = await response.json();
      currentUser = userData;
      localStorage.setItem("currentUser", JSON.stringify(userData));
      updateAuthUI();
    } catch (error) {
      console.error("Error validating session:", error);
      logout();
    }
  }

  async function login(username, password) {
    try {
      const response = await fetch(
        `/auth/login?username=${encodeURIComponent(
          username
        )}&password=${encodeURIComponent(password)}`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        showLoginMessage(data.detail || "Invalid username or password", "error");
        return false;
      }

      currentUser = data;
      localStorage.setItem("currentUser", JSON.stringify(data));
      updateAuthUI();
      closeLoginModalHandler();
      showMessage(`Welcome, ${currentUser.display_name}!`, "success");
      return true;
    } catch (error) {
      console.error("Error during login:", error);
      showLoginMessage("Login failed. Please try again.", "error");
      return false;
    }
  }

  function logout() {
    currentUser = null;
    localStorage.removeItem("currentUser");
    updateAuthUI();
    showMessage("You have been logged out.", "info");
  }

  function showLoginMessage(text, type) {
    loginMessage.textContent = text;
    loginMessage.className = `message ${type}`;
    loginMessage.classList.remove("hidden");
  }

  function showAnnouncementAdminMessage(text, type) {
    announcementAdminMessage.textContent = text;
    announcementAdminMessage.className = `message ${type}`;
    announcementAdminMessage.classList.remove("hidden");

    setTimeout(() => {
      announcementAdminMessage.classList.add("hidden");
    }, 4000);
  }

  function openLoginModal() {
    loginModal.classList.remove("hidden");
    loginModal.classList.add("show");
    loginMessage.classList.add("hidden");
    loginForm.reset();
  }

  function closeLoginModalHandler() {
    loginModal.classList.remove("show");
    setTimeout(() => {
      loginModal.classList.add("hidden");
      loginForm.reset();
    }, 300);
  }

  function openRegistrationModal(activityName) {
    modalActivityName.textContent = activityName;
    activityInput.value = activityName;
    registrationModal.classList.remove("hidden");
    setTimeout(() => {
      registrationModal.classList.add("show");
    }, 10);
  }

  function closeRegistrationModalHandler() {
    registrationModal.classList.remove("show");
    setTimeout(() => {
      registrationModal.classList.add("hidden");
      signupForm.reset();
    }, 300);
  }

  function openAnnouncementsModal() {
    if (!currentUser) {
      showMessage("You must be signed in to manage announcements.", "error");
      return;
    }

    announcementsModal.classList.remove("hidden");
    setTimeout(() => {
      announcementsModal.classList.add("show");
    }, 10);

    resetAnnouncementForm();
    fetchManagedAnnouncements();
  }

  function closeAnnouncementsModalHandler() {
    announcementsModal.classList.remove("show");
    setTimeout(() => {
      announcementsModal.classList.add("hidden");
    }, 300);
  }

  function resetAnnouncementForm() {
    announcementIdInput.value = "";
    announcementMessageInput.value = "";
    announcementStartDateInput.value = "";
    announcementExpirationInput.value = "";
    announcementSubmitButton.textContent = "Save announcement";
    announcementCancelEdit.classList.add("hidden");
  }

  async function fetchActiveAnnouncements() {
    announcementItems.innerHTML = '<p class="announcement-placeholder">Loading announcements...</p>';

    try {
      const response = await fetch("/announcements/active");
      if (!response.ok) {
        throw new Error("Unable to load announcements");
      }

      const announcements = await response.json();
      renderAnnouncementBanner(announcements);
    } catch (error) {
      console.error("Error fetching active announcements:", error);
      announcementItems.innerHTML =
        '<p class="announcement-placeholder">Announcements are temporarily unavailable.</p>';
    }
  }

  function renderAnnouncementBanner(announcements) {
    if (!announcements || announcements.length === 0) {
      announcementItems.innerHTML =
        '<p class="announcement-placeholder">No active announcements right now.</p>';
      return;
    }

    announcementItems.innerHTML = announcements
      .map(
        (announcement) => `
          <article class="announcement-item">
            <p>${announcement.message}</p>
            <small>Valid until ${formatDateLabel(announcement.expires_on)}</small>
          </article>
        `
      )
      .join("");
  }

  async function fetchManagedAnnouncements() {
    if (!currentUser) {
      return;
    }

    announcementAdminList.innerHTML = '<p class="announcement-placeholder">Loading announcements...</p>';

    try {
      const response = await fetch(
        `/announcements?teacher_username=${encodeURIComponent(currentUser.username)}`
      );
      const data = await response.json();

      if (!response.ok) {
        showAnnouncementAdminMessage(data.detail || "Unable to load announcements", "error");
        announcementAdminList.innerHTML =
          '<p class="announcement-placeholder">Unable to load announcements.</p>';
        return;
      }

      managedAnnouncements = data;
      renderManagedAnnouncements();
    } catch (error) {
      console.error("Error fetching managed announcements:", error);
      showAnnouncementAdminMessage("Unable to load announcements", "error");
      announcementAdminList.innerHTML =
        '<p class="announcement-placeholder">Unable to load announcements.</p>';
    }
  }

  function formatDateLabel(value) {
    if (!value) {
      return "Not set";
    }

    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return parsed.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function getAnnouncementStatus(announcement) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiresOn = new Date(`${announcement.expires_on}T00:00:00`);
    const startDate = announcement.start_date
      ? new Date(`${announcement.start_date}T00:00:00`)
      : null;

    if (expiresOn < today) {
      return { label: "Expired", className: "status-expired" };
    }

    if (startDate && startDate > today) {
      return { label: "Upcoming", className: "status-upcoming" };
    }

    return { label: "Active", className: "status-active" };
  }

  function renderManagedAnnouncements() {
    if (!managedAnnouncements || managedAnnouncements.length === 0) {
      announcementAdminList.innerHTML =
        '<p class="announcement-placeholder">No announcements yet. Add your first one above.</p>';
      return;
    }

    announcementAdminList.innerHTML = managedAnnouncements
      .map((announcement) => {
        const status = getAnnouncementStatus(announcement);
        return `
          <article class="announcement-admin-item">
            <div class="announcement-admin-top">
              <span class="announcement-status ${status.className}">${status.label}</span>
              <div class="announcement-admin-actions">
                <button type="button" class="small-button edit-announcement" data-announcement-id="${announcement.id}">Edit</button>
                <button type="button" class="small-button danger-button delete-announcement" data-announcement-id="${announcement.id}">Delete</button>
              </div>
            </div>
            <p>${announcement.message}</p>
            <div class="announcement-admin-dates">
              <span>Start: ${announcement.start_date ? formatDateLabel(announcement.start_date) : "Immediate"}</span>
              <span>Expires: ${formatDateLabel(announcement.expires_on)}</span>
            </div>
          </article>
        `;
      })
      .join("");

    const editButtons = announcementAdminList.querySelectorAll(".edit-announcement");
    editButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const selectedId = button.dataset.announcementId;
        const selectedAnnouncement = managedAnnouncements.find(
          (announcement) => announcement.id === selectedId
        );

        if (!selectedAnnouncement) {
          return;
        }

        announcementIdInput.value = selectedAnnouncement.id;
        announcementMessageInput.value = selectedAnnouncement.message;
        announcementStartDateInput.value = selectedAnnouncement.start_date || "";
        announcementExpirationInput.value = selectedAnnouncement.expires_on;
        announcementSubmitButton.textContent = "Update announcement";
        announcementCancelEdit.classList.remove("hidden");
        announcementMessageInput.focus();
      });
    });

    const deleteButtons = announcementAdminList.querySelectorAll(
      ".delete-announcement"
    );
    deleteButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const selectedId = button.dataset.announcementId;
        const selectedAnnouncement = managedAnnouncements.find(
          (announcement) => announcement.id === selectedId
        );

        if (!selectedAnnouncement) {
          return;
        }

        showConfirmationDialog(
          "Delete this announcement? This action cannot be undone.",
          async () => {
            await deleteAnnouncement(selectedAnnouncement.id);
          }
        );
      });
    });
  }

  async function saveAnnouncement(event) {
    event.preventDefault();

    if (!currentUser) {
      showAnnouncementAdminMessage("You must be signed in.", "error");
      return;
    }

    const message = announcementMessageInput.value.trim();
    const startDate = announcementStartDateInput.value || null;
    const expiresOn = announcementExpirationInput.value;

    if (!message) {
      showAnnouncementAdminMessage("Message is required.", "error");
      return;
    }

    if (!expiresOn) {
      showAnnouncementAdminMessage("Expiration date is required.", "error");
      return;
    }

    if (startDate && startDate > expiresOn) {
      showAnnouncementAdminMessage(
        "Start date cannot be after expiration date.",
        "error"
      );
      return;
    }

    const payload = {
      message,
      start_date: startDate,
      expires_on: expiresOn,
    };

    const editingId = announcementIdInput.value;
    const endpoint = editingId ? `/announcements/${editingId}` : "/announcements";
    const method = editingId ? "PUT" : "POST";

    try {
      const response = await fetch(
        `${endpoint}?teacher_username=${encodeURIComponent(currentUser.username)}`,
        {
          method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        showAnnouncementAdminMessage(data.detail || "Unable to save announcement", "error");
        return;
      }

      showAnnouncementAdminMessage(
        editingId ? "Announcement updated" : "Announcement created",
        "success"
      );
      resetAnnouncementForm();
      await fetchManagedAnnouncements();
      await fetchActiveAnnouncements();
    } catch (error) {
      console.error("Error saving announcement:", error);
      showAnnouncementAdminMessage("Unable to save announcement", "error");
    }
  }

  async function deleteAnnouncement(announcementId) {
    if (!currentUser) {
      showAnnouncementAdminMessage("You must be signed in.", "error");
      return;
    }

    try {
      const response = await fetch(
        `/announcements/${encodeURIComponent(
          announcementId
        )}?teacher_username=${encodeURIComponent(currentUser.username)}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        showAnnouncementAdminMessage(data.detail || "Unable to delete announcement", "error");
        return;
      }

      showAnnouncementAdminMessage("Announcement deleted", "success");
      resetAnnouncementForm();
      await fetchManagedAnnouncements();
      await fetchActiveAnnouncements();
    } catch (error) {
      console.error("Error deleting announcement:", error);
      showAnnouncementAdminMessage("Unable to delete announcement", "error");
    }
  }

  function showLoadingSkeletons() {
    activitiesList.innerHTML = "";

    for (let i = 0; i < 9; i += 1) {
      const skeletonCard = document.createElement("div");
      skeletonCard.className = "skeleton-card";
      skeletonCard.innerHTML = `
        <div class="skeleton-line skeleton-title"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line skeleton-text short"></div>
        <div style="margin-top: 8px;">
          <div class="skeleton-line" style="height: 6px;"></div>
          <div class="skeleton-line skeleton-text short" style="height: 8px; margin-top: 3px;"></div>
        </div>
        <div style="margin-top: auto;">
          <div class="skeleton-line" style="height: 24px; margin-top: 8px;"></div>
        </div>
      `;
      activitiesList.appendChild(skeletonCard);
    }
  }

  function formatSchedule(details) {
    if (details.schedule_details) {
      const days = details.schedule_details.days.join(", ");

      const formatTime = (time24) => {
        const [hours, minutes] = time24.split(":").map((num) => parseInt(num, 10));
        const period = hours >= 12 ? "PM" : "AM";
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
      };

      const startTime = formatTime(details.schedule_details.start_time);
      const endTime = formatTime(details.schedule_details.end_time);

      return `${days}, ${startTime} - ${endTime}`;
    }

    return details.schedule;
  }

  function getActivityType(activityName, description) {
    const name = activityName.toLowerCase();
    const desc = description.toLowerCase();

    if (
      name.includes("soccer") ||
      name.includes("basketball") ||
      name.includes("sport") ||
      name.includes("fitness") ||
      desc.includes("team") ||
      desc.includes("game") ||
      desc.includes("athletic")
    ) {
      return "sports";
    }

    if (
      name.includes("art") ||
      name.includes("music") ||
      name.includes("theater") ||
      name.includes("drama") ||
      desc.includes("creative") ||
      desc.includes("paint")
    ) {
      return "arts";
    }

    if (
      name.includes("science") ||
      name.includes("math") ||
      name.includes("academic") ||
      name.includes("study") ||
      name.includes("olympiad") ||
      desc.includes("learning") ||
      desc.includes("education") ||
      desc.includes("competition")
    ) {
      return "academic";
    }

    if (
      name.includes("volunteer") ||
      name.includes("community") ||
      desc.includes("service") ||
      desc.includes("volunteer")
    ) {
      return "community";
    }

    if (
      name.includes("computer") ||
      name.includes("coding") ||
      name.includes("tech") ||
      name.includes("robotics") ||
      desc.includes("programming") ||
      desc.includes("technology") ||
      desc.includes("digital") ||
      desc.includes("robot")
    ) {
      return "technology";
    }

    return "academic";
  }

  async function fetchActivities() {
    showLoadingSkeletons();

    try {
      const queryParams = [];

      if (currentDay) {
        queryParams.push(`day=${encodeURIComponent(currentDay)}`);
      }

      if (currentTimeRange) {
        const range = timeRanges[currentTimeRange];

        if (currentTimeRange !== "weekend" && range) {
          queryParams.push(`start_time=${encodeURIComponent(range.start)}`);
          queryParams.push(`end_time=${encodeURIComponent(range.end)}`);
        }
      }

      const queryString = queryParams.length > 0 ? `?${queryParams.join("&")}` : "";
      const response = await fetch(`/activities${queryString}`);
      const activities = await response.json();

      allActivities = activities;
      displayFilteredActivities();
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  function displayFilteredActivities() {
    activitiesList.innerHTML = "";

    const filteredActivities = {};

    Object.entries(allActivities).forEach(([name, details]) => {
      const activityType = getActivityType(name, details.description);

      if (currentFilter !== "all" && activityType !== currentFilter) {
        return;
      }

      if (currentTimeRange === "weekend" && details.schedule_details) {
        const activityDays = details.schedule_details.days;
        const isWeekendActivity = activityDays.some((day) =>
          timeRanges.weekend.days.includes(day)
        );

        if (!isWeekendActivity) {
          return;
        }
      }

      const searchableContent = [
        name.toLowerCase(),
        details.description.toLowerCase(),
        formatSchedule(details).toLowerCase(),
      ].join(" ");

      if (searchQuery && !searchableContent.includes(searchQuery.toLowerCase())) {
        return;
      }

      filteredActivities[name] = details;
    });

    if (Object.keys(filteredActivities).length === 0) {
      activitiesList.innerHTML = `
        <div class="no-results">
          <h4>No activities found</h4>
          <p>Try adjusting your search or filter criteria</p>
        </div>
      `;
      return;
    }

    Object.entries(filteredActivities).forEach(([name, details]) => {
      renderActivityCard(name, details);
    });
  }

  function renderActivityCard(name, details) {
    const activityCard = document.createElement("div");
    activityCard.className = "activity-card";

    const totalSpots = details.max_participants;
    const takenSpots = details.participants.length;
    const spotsLeft = totalSpots - takenSpots;
    const capacityPercentage = (takenSpots / totalSpots) * 100;
    const isFull = spotsLeft <= 0;

    let capacityStatusClass = "capacity-available";
    if (isFull) {
      capacityStatusClass = "capacity-full";
    } else if (capacityPercentage >= 75) {
      capacityStatusClass = "capacity-near-full";
    }

    const activityType = getActivityType(name, details.description);
    const typeInfo = activityTypes[activityType];
    const formattedSchedule = formatSchedule(details);

    const tagHtml = `
      <span class="activity-tag" style="background-color: ${typeInfo.color}; color: ${typeInfo.textColor}">
        ${typeInfo.label}
      </span>
    `;

    const capacityIndicator = `
      <div class="capacity-container ${capacityStatusClass}">
        <div class="capacity-bar-bg">
          <div class="capacity-bar-fill" style="width: ${capacityPercentage}%"></div>
        </div>
        <div class="capacity-text">
          <span>${takenSpots} enrolled</span>
          <span>${spotsLeft} spots left</span>
        </div>
      </div>
    `;

    activityCard.innerHTML = `
      ${tagHtml}
      <h4>${name}</h4>
      <p>${details.description}</p>
      <p class="tooltip">
        <strong>Schedule:</strong> ${formattedSchedule}
        <span class="tooltip-text">Regular meetings at this time throughout the semester</span>
      </p>
      ${capacityIndicator}
      <div class="participants-list">
        <h5>Current Participants:</h5>
        <ul>
          ${details.participants
            .map(
              (email) => `
            <li>
              ${email}
              ${
                currentUser
                  ? `
                <span class="delete-participant tooltip" data-activity="${name}" data-email="${email}">
                  ✖
                  <span class="tooltip-text">Unregister this student</span>
                </span>
              `
                  : ""
              }
            </li>
          `
            )
            .join("")}
        </ul>
      </div>
      <div class="activity-card-actions">
        ${
          currentUser
            ? `
          <button class="register-button" data-activity="${name}" ${
                isFull ? "disabled" : ""
              }>
            ${isFull ? "Activity Full" : "Register Student"}
          </button>
        `
            : `
          <div class="auth-notice">
            Teachers can register students.
          </div>
        `
        }
      </div>
    `;

    const deleteButtons = activityCard.querySelectorAll(".delete-participant");
    deleteButtons.forEach((button) => {
      button.addEventListener("click", handleUnregister);
    });

    if (currentUser) {
      const registerButton = activityCard.querySelector(".register-button");
      if (!isFull && registerButton) {
        registerButton.addEventListener("click", () => {
          openRegistrationModal(name);
        });
      }
    }

    activitiesList.appendChild(activityCard);
  }

  async function handleUnregister(event) {
    if (!currentUser) {
      showMessage("You must be logged in as a teacher to unregister students.", "error");
      return;
    }

    const activity = event.target.dataset.activity;
    const email = event.target.dataset.email;

    showConfirmationDialog(
      `Are you sure you want to unregister ${email} from ${activity}?`,
      async () => {
        try {
          const response = await fetch(
            `/activities/${encodeURIComponent(
              activity
            )}/unregister?email=${encodeURIComponent(
              email
            )}&teacher_username=${encodeURIComponent(currentUser.username)}`,
            {
              method: "POST",
            }
          );

          const result = await response.json();

          if (response.ok) {
            showMessage(result.message, "success");
            fetchActivities();
          } else {
            showMessage(result.detail || "An error occurred", "error");
          }
        } catch (error) {
          showMessage("Failed to unregister. Please try again.", "error");
          console.error("Error unregistering:", error);
        }
      }
    );
  }

  function showConfirmationDialog(message, confirmCallback) {
    let confirmDialog = document.getElementById("confirm-dialog");
    if (!confirmDialog) {
      confirmDialog = document.createElement("div");
      confirmDialog.id = "confirm-dialog";
      confirmDialog.className = "modal hidden";
      confirmDialog.innerHTML = `
        <div class="modal-content">
          <h3>Confirm Action</h3>
          <p id="confirm-message"></p>
          <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
            <button id="cancel-button" class="cancel-btn">Cancel</button>
            <button id="confirm-button" class="confirm-btn">Confirm</button>
          </div>
        </div>
      `;
      document.body.appendChild(confirmDialog);

      const cancelBtn = confirmDialog.querySelector("#cancel-button");
      const confirmBtn = confirmDialog.querySelector("#confirm-button");

      cancelBtn.style.backgroundColor = "#f1f1f1";
      cancelBtn.style.color = "#333";

      confirmBtn.style.backgroundColor = "#dc3545";
      confirmBtn.style.color = "white";
    }

    const confirmMessage = document.getElementById("confirm-message");
    confirmMessage.textContent = message;

    confirmDialog.classList.remove("hidden");
    setTimeout(() => {
      confirmDialog.classList.add("show");
    }, 10);

    const cancelButton = document.getElementById("cancel-button");
    const confirmButton = document.getElementById("confirm-button");

    const newCancelButton = cancelButton.cloneNode(true);
    const newConfirmButton = confirmButton.cloneNode(true);
    cancelButton.parentNode.replaceChild(newCancelButton, cancelButton);
    confirmButton.parentNode.replaceChild(newConfirmButton, confirmButton);

    newCancelButton.addEventListener("click", () => {
      confirmDialog.classList.remove("show");
      setTimeout(() => {
        confirmDialog.classList.add("hidden");
      }, 300);
    });

    newConfirmButton.addEventListener("click", () => {
      confirmCallback();
      confirmDialog.classList.remove("show");
      setTimeout(() => {
        confirmDialog.classList.add("hidden");
      }, 300);
    });

    confirmDialog.addEventListener("click", (event) => {
      if (event.target === confirmDialog) {
        confirmDialog.classList.remove("show");
        setTimeout(() => {
          confirmDialog.classList.add("hidden");
        }, 300);
      }
    });
  }

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  // Filter handlers
  searchInput.addEventListener("input", (event) => {
    searchQuery = event.target.value;
    displayFilteredActivities();
  });

  searchButton.addEventListener("click", (event) => {
    event.preventDefault();
    searchQuery = searchInput.value;
    displayFilteredActivities();
  });

  categoryFilters.forEach((button) => {
    button.addEventListener("click", () => {
      categoryFilters.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");

      currentFilter = button.dataset.category;
      displayFilteredActivities();
    });
  });

  dayFilters.forEach((button) => {
    button.addEventListener("click", () => {
      dayFilters.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");

      currentDay = button.dataset.day;
      fetchActivities();
    });
  });

  timeFilters.forEach((button) => {
    button.addEventListener("click", () => {
      timeFilters.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");

      currentTimeRange = button.dataset.time;
      fetchActivities();
    });
  });

  // Activity registration handlers
  closeRegistrationModal.addEventListener("click", closeRegistrationModalHandler);

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentUser) {
      showMessage("You must be logged in as a teacher to register students.", "error");
      return;
    }

    const email = document.getElementById("email").value;
    const activity = activityInput.value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(
          email
        )}&teacher_username=${encodeURIComponent(currentUser.username)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        closeRegistrationModalHandler();
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  // Authentication handlers
  loginButton.addEventListener("click", openLoginModal);
  logoutButton.addEventListener("click", logout);
  closeLoginModal.addEventListener("click", closeLoginModalHandler);

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    await login(username, password);
  });

  // Announcement management handlers
  manageAnnouncementsButton.addEventListener("click", openAnnouncementsModal);
  closeAnnouncementsModal.addEventListener("click", closeAnnouncementsModalHandler);
  announcementCancelEdit.addEventListener("click", resetAnnouncementForm);
  announcementForm.addEventListener("submit", saveAnnouncement);

  // Close modals when clicking outside
  window.addEventListener("click", (event) => {
    if (event.target === loginModal) {
      closeLoginModalHandler();
    }

    if (event.target === registrationModal) {
      closeRegistrationModalHandler();
    }

    if (event.target === announcementsModal) {
      closeAnnouncementsModalHandler();
    }
  });

  // Public helper access
  window.activityFilters = {
    setDayFilter: (day) => {
      currentDay = day;
      fetchActivities();
    },
    setTimeRangeFilter: (timeRange) => {
      currentTimeRange = timeRange;
      fetchActivities();
    },
  };

  // Initialize app
  initializeFilters();
  checkAuthentication();
  fetchActiveAnnouncements();
  fetchActivities();
});
