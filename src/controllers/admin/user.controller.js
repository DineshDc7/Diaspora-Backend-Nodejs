const { Op } = require("sequelize");
const { User } = require("../../models");
const { OK, FAIL } = require("../../utils/response");
const bcrypt = require("bcryptjs");

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

exports.getUsers = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const offset = (page - 1) * limit;

    const search = req.query.search ? String(req.query.search).trim() : "";

    // Support BOTH: role filter (existing) and tab filter (new, UI-friendly)
    const role = req.query.role ? String(req.query.role).trim() : "";
    const tab = req.query.tab ? String(req.query.tab).trim().toLowerCase() : "";

    // Optional active filter
    const isActiveParam = req.query.isActive;
    const hasIsActiveFilter = isActiveParam !== undefined && isActiveParam !== "";
    const isActive =
      hasIsActiveFilter ? String(isActiveParam).toLowerCase() === "true" : undefined;

    // Sorting (safe whitelist)
    const sortByRaw = req.query.sortBy ? String(req.query.sortBy).trim() : "createdAt";
    const orderRaw = req.query.order ? String(req.query.order).trim().toLowerCase() : "desc";

    const allowedSortBy = ["createdAt", "name"];
    const sortBy = allowedSortBy.includes(sortByRaw) ? sortByRaw : "createdAt";

    const sortOrder = orderRaw === "asc" ? "ASC" : "DESC";

    const where = {};

    // ✅ tab -> role mapping (UI uses tab, backend maps to enum)
    if (tab) {
      if (tab === "admins") where.role = "ADMIN";
      else if (tab === "owners") where.role = "BUSINESS_OWNER";
      else if (tab === "investors") where.role = "INVESTOR";
      // tab=all -> no role filter
    }

    // ✅ direct role filter still supported and overrides tab if provided
    if (role) {
      where.role = role;
    }

    if (hasIsActiveFilter) {
      where.isActive = isActive;
    }

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { mobile: { [Op.like]: `%${search}%` } }, // helpful for phone search
      ];
    }

    const { rows, count } = await User.findAndCountAll({
      where,
      attributes: ["id", "name", "email", "mobile", "role", "isActive", "createdAt"],
      limit,
      offset,
      order: [[sortBy, sortOrder]],
    });

    return OK(res, "users_list", {
      users: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
        hasPrevPage: page > 1,
        hasNextPage: page < Math.ceil(count / limit),
        prevPage: page > 1 ? page - 1 : null,
        nextPage: page < Math.ceil(count / limit) ? page + 1 : null,
      },
      appliedFilters: {
        tab: tab || "all",
        role: where.role || null,
        search: search || null,
        isActive: hasIsActiveFilter ? where.isActive : null,
        sortBy,
        order: sortOrder.toLowerCase(),
      },
    });
  } catch (err) {
    console.error("admin getUsers error:", err);
    return FAIL(res, "server error", "SERVER_ERROR", 500);
  }
};

exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role, mobile } = req.body;

    // Basic validations (keep simple)
    if (!name || typeof name !== "string" || !name.trim()) {
      return FAIL(res, "Name is required", "VALIDATION_NAME_REQUIRED", 400);
    }

    if (!isValidEmail(email)) {
      return FAIL(res, "Valid email is required", "VALIDATION_EMAIL_INVALID", 400);
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return FAIL(res, "Password must be at least 8 characters", "VALIDATION_PASSWORD_WEAK", 400);
    }

    const allowedRoles = ["ADMIN", "INVESTOR", "BUSINESS_OWNER"];
    if (!role || !allowedRoles.includes(role)) {
      return FAIL(res, "Valid role is required", "VALIDATION_ROLE_INVALID", 400);
    }

    // Email must be unique
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return FAIL(res, "Email already exists", "AUTH_EMAIL_EXISTS", 409);
    }

    // NOTE: per your requirement -> do NOT check duplicate mobile
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      role,
      mobile: mobile ? String(mobile).trim() : null,
      isActive: true,
    });

    return OK(res, "user_created", {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    }, 201);
  } catch (err) {
    console.error("admin createUser error:", err);
    return FAIL(res, "server error", "SERVER_ERROR", 500);
  }
};

exports.updateUser = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) {
      return FAIL(res, "Invalid user id", "VALIDATION_ID_INVALID", 400);
    }

    const { name, role, mobile, isActive } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return FAIL(res, "User not found", "USER_NOT_FOUND", 404);
    }

    // ✅ Update name (optional)
    if (name !== undefined) {
      if (!name || typeof name !== "string" || !name.trim()) {
        return FAIL(res, "Name is invalid", "VALIDATION_NAME_INVALID", 400);
      }
      user.name = name.trim();
    }

    // ✅ Update role (optional)
    if (role !== undefined) {
      const allowedRoles = ["ADMIN", "INVESTOR", "BUSINESS_OWNER"];
      if (!allowedRoles.includes(role)) {
        return FAIL(res, "Role is invalid", "VALIDATION_ROLE_INVALID", 400);
      }
      user.role = role;
    }

    // ✅ Update mobile (optional)
    if (mobile !== undefined) {
      user.mobile = mobile ? String(mobile).trim() : null;
    }

    // ✅ Optional: allow admin to disable/enable user (not in UI now but useful)
    if (isActive !== undefined) {
      user.isActive = Boolean(isActive);
    }

    // ❌ Email is NOT editable here (matches UI)
    // ❌ Password is NOT editable here (matches UI)

    await user.save();

    return OK(res, "user_updated", {
      user: {
        id: user.id,
        name: user.name,
        email: user.email, // returned for UI display (read-only)
        mobile: user.mobile,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (err) {
    console.error("admin updateUser error:", err);
    return FAIL(res, "server error", "SERVER_ERROR", 500);
  }
};

exports.getUserStats = async (req, res) => {
  try {
    const totalUsers = await User.count();

    const admins = await User.count({ where: { role: "ADMIN" } });
    const investors = await User.count({ where: { role: "INVESTOR" } });
    const businessOwners = await User.count({ where: { role: "BUSINESS_OWNER" } });

    return OK(res, "users_stats", {
      totalUsers,
      countsByRole: {
        ADMIN: admins,
        INVESTOR: investors,
        BUSINESS_OWNER: businessOwners,
      },
    });
  } catch (err) {
    console.error("admin getUserStats error:", err);
    return FAIL(res, "server error", "SERVER_ERROR", 500);
  }
};

exports.getUserById = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) {
      return FAIL(res, "Invalid user id", "VALIDATION_ID_INVALID", 400);
    }

    const user = await User.findByPk(id, {
      attributes: [
        "id",
        "name",
        "email",
        "mobile",
        "role",
        "isActive",
        "createdAt",
        "updatedAt",
      ],
    });

    if (!user) {
      return FAIL(res, "User not found", "USER_NOT_FOUND", 404);
    }

    return OK(res, "user_details", { user });
  } catch (err) {
    console.error("admin getUserById error:", err);
    return FAIL(res, "server error", "SERVER_ERROR", 500);
  }
};

exports.getUsersOverview = async (req, res) => {
  try {
    // ---------- LIST LOGIC (same as getUsers) ----------
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const offset = (page - 1) * limit;

    const search = req.query.search ? String(req.query.search).trim() : "";
    const role = req.query.role ? String(req.query.role).trim() : "";
    const tab = req.query.tab ? String(req.query.tab).trim().toLowerCase() : "";

    const isActiveParam = req.query.isActive;
    const hasIsActiveFilter = isActiveParam !== undefined && isActiveParam !== "";
    const isActive =
      hasIsActiveFilter ? String(isActiveParam).toLowerCase() === "true" : undefined;

    const sortByRaw = req.query.sortBy ? String(req.query.sortBy).trim() : "createdAt";
    const orderRaw = req.query.order ? String(req.query.order).trim().toLowerCase() : "desc";

    const allowedSortBy = ["createdAt", "name"];
    const sortBy = allowedSortBy.includes(sortByRaw) ? sortByRaw : "createdAt";
    const sortOrder = orderRaw === "asc" ? "ASC" : "DESC";

    const where = {};

    if (tab) {
      if (tab === "admins") where.role = "ADMIN";
      else if (tab === "owners") where.role = "BUSINESS_OWNER";
      else if (tab === "investors") where.role = "INVESTOR";
    }

    if (role) {
      where.role = role;
    }

    if (hasIsActiveFilter) {
      where.isActive = isActive;
    }

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { mobile: { [Op.like]: `%${search}%` } },
      ];
    }

    const { rows, count } = await User.findAndCountAll({
      where,
      attributes: ["id", "name", "email", "mobile", "role", "isActive", "createdAt"],
      limit,
      offset,
      order: [[sortBy, sortOrder]],
    });

    // ---------- STATS LOGIC ----------
    const totalUsers = await User.count();
    const admins = await User.count({ where: { role: "ADMIN" } });
    const investors = await User.count({ where: { role: "INVESTOR" } });
    const businessOwners = await User.count({ where: { role: "BUSINESS_OWNER" } });

    return OK(res, "users_overview", {
      users: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
      stats: {
        totalUsers,
        countsByRole: {
          ADMIN: admins,
          INVESTOR: investors,
          BUSINESS_OWNER: businessOwners,
        },
      },
      appliedFilters: {
        tab: tab || "all",
        role: where.role || null,
        search: search || null,
        isActive: hasIsActiveFilter ? where.isActive : null,
        sortBy,
        order: sortOrder.toLowerCase(),
      },
    });
  } catch (err) {
    console.error("admin getUsersOverview error:", err);
    return FAIL(res, "server error", "SERVER_ERROR", 500);
  }
};

exports.getUserOptions = async (req, res) => {
  try {
    const roleParam = req.query.role ? String(req.query.role).trim().toUpperCase() : "";

    const allowedRoles = ["ADMIN", "INVESTOR", "BUSINESS_OWNER"];

    const where = {};
    if (roleParam) {
      if (!allowedRoles.includes(roleParam)) {
        return FAIL(res, "Invalid role", "VALIDATION_ROLE_INVALID", 400);
      }
      where.role = roleParam;
    }

    const users = await User.findAll({
      where,
      attributes: ["id", "name", "email", "mobile", "role", "isActive", "createdAt"],
      order: [["name", "ASC"]],
      limit: 500, // dropdown safety limit
    });

    return OK(res, "user_options", { users });
  } catch (err) {
    console.error("admin getUserOptions error:", err);
    return FAIL(res, "server error", "SERVER_ERROR", 500);
  }
};

// PATCH /admin/users/:id/status
// Body: { isActive: true | false }
exports.updateUserStatus = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) {
      return FAIL(res, "Invalid user id", "VALIDATION_ID_INVALID", 400);
    }

    const { isActive } = req.body;

    if (isActive === undefined) {
      return FAIL(res, "isActive is required", "VALIDATION_IS_ACTIVE_REQUIRED", 400);
    }

    const user = await User.findByPk(id);
    if (!user) {
      return FAIL(res, "User not found", "USER_NOT_FOUND", 404);
    }

    // Safety: admin should not disable their own account
    if (req.user && req.user.id === user.id && isActive === false) {
      return FAIL(res, "You cannot disable your own account", "AUTH_SELF_DISABLE_FORBIDDEN", 403);
    }

    user.isActive = Boolean(isActive);
    await user.save();

    return OK(res, "user_status_updated", {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        isActive: user.isActive,
        updatedAt: user.updatedAt,
      },
    });
  } catch (err) {
    console.error("admin updateUserStatus error:", err);
    return FAIL(res, "server error", "SERVER_ERROR", 500);
  }
};