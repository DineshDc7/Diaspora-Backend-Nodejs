const { User, Business, Report } = require("../../models");
const { OK, FAIL } = require("../../utils/response");
const { Op } = require("sequelize");

function pickNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// Best-effort sales extractor for dynamic report data
function extractSalesFromReportData(data) {
  if (!data) return 0;

  // ✅ handle when Sequelize/MySQL returns JSON as string
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch (e) {
      return 0;
    }
  }

  if (typeof data !== "object") return 0;

  const candidates = [
    "salesToday",
    "totalSales",
    "sales",
    "revenue",
    "totalRevenue",
    "grossSales",
  ];

  for (const key of candidates) {
    if (data[key] !== undefined) return pickNumber(data[key]);
  }

  return 0;
}

function safeParseData(data) {
  if (!data) return null;
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  return typeof data === "object" ? data : null;
}

function getSalesValueFromData(dataObj) {
  if (!dataObj) return 0;

  // daily might be salesToday, others might be totalSales
  const candidates = ["salesToday", "totalSales", "sales", "revenue", "totalRevenue", "grossSales"];
  for (const k of candidates) {
    if (dataObj[k] !== undefined) return pickNumber(dataObj[k]);
  }
  return 0;
}

exports.getAdminDashboardOverview = async (req, res) => {
  try {
    // Users counts
    const totalUsers = await User.count();
    const totalAdmins = await User.count({ where: { role: "ADMIN" } });
    const totalInvestors = await User.count({ where: { role: "INVESTOR" } });
    const totalBusinessOwners = await User.count({ where: { role: "BUSINESS_OWNER" } });

    // Businesses + Reports counts
    const totalBusinesses = await Business.count();
    const totalReports = await Report.count();

    // Reports by type
    const reportTypes = ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"];
    const reportsByType = {};
    for (const t of reportTypes) {
      reportsByType[t] = await Report.count({ where: { reportType: t } });
    }

    // Total sales (best-effort): sum from JSON `data`
    // NOTE: We compute in Node because `data` is JSON and keys vary.
    // For very large data, we will optimize later (cache / pre-aggregation).
    // ✅ Sales KPIs (DAILY only) to avoid double-counting across weekly/monthly/yearly
    const now = new Date();

    // Today range
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    // This month range
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);

    // Last 30 days range
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Fetch DAILY reports for each range
    const dailyToday = await Report.findAll({
    where: {
        reportType: "DAILY",
        createdAt: { [Op.gte]: startOfToday, [Op.lt]: startOfTomorrow },
    },
    attributes: ["data"],
    });

    const dailyThisMonth = await Report.findAll({
    where: {
        reportType: "DAILY",
        createdAt: { [Op.gte]: startOfMonth, [Op.lt]: startOfNextMonth },
    },
    attributes: ["data"],
    });

    const dailyLast30 = await Report.findAll({
    where: {
        reportType: "DAILY",
        createdAt: { [Op.gte]: last30Days },
    },
    attributes: ["data"],
    });

    // Sum sales
    let salesToday = 0;
    for (const r of dailyToday) {
    const obj = safeParseData(r.data);
    salesToday += getSalesValueFromData(obj);
    }

    let salesThisMonth = 0;
    for (const r of dailyThisMonth) {
    const obj = safeParseData(r.data);
    salesThisMonth += getSalesValueFromData(obj);
    }

    let salesLast30Days = 0;
    for (const r of dailyLast30) {
    const obj = safeParseData(r.data);
    salesLast30Days += getSalesValueFromData(obj);
    }    

    // Recent lists (latest 5)
    const recentBusinesses = await Business.findAll({
      attributes: ["id", "businessName", "ownerName", "ownerPhone", "category", "city", "createdAt"],
      order: [["createdAt", "DESC"]],
      limit: 5,
    });

    const recentReports = await Report.findAll({
      attributes: ["id", "businessId", "createdByUserId", "reportType", "data", "createdAt"],
      order: [["createdAt", "DESC"]],
      limit: 5,
    });

    const recentUsers = await User.findAll({
      attributes: ["id", "name", "email", "mobile", "role", "isActive", "createdAt"],
      order: [["createdAt", "DESC"]],
      limit: 5,
    });

    return OK(res, "admin_dashboard_overview", {
      totals: {
        totalBusinesses,
        totalReports,
        salesToday,
        salesThisMonth,
        salesLast30Days,
        totalUsers,
        totalInvestors,
        totalBusinessOwners,
        totalAdmins,
        },
      reportsByType,
      recent: {
        businesses: recentBusinesses,
        reports: recentReports,
        users: recentUsers,
      },
    });
  } catch (err) {
    console.error("admin dashboard overview error:", err);
    return FAIL(res, "server error", "SERVER_ERROR", 500);
  }
};