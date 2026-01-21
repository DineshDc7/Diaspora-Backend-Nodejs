const { Op } = require("sequelize");
const { Business, Report } = require("../../models");
const { OK, FAIL } = require("../../utils/response");

function pickNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
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

function getSalesValue(dataObj) {
  if (!dataObj) return 0;
  const keys = ["salesToday", "totalSales", "sales", "revenue", "totalRevenue", "grossSales"];
  for (const k of keys) {
    if (dataObj[k] !== undefined) return pickNumber(dataObj[k]);
  }
  return 0;
}

function getExpenseValue(dataObj) {
  if (!dataObj) return 0;
  const keys = ["expensesToday", "totalExpenses", "expenses", "cost", "totalCost"];
  for (const k of keys) {
    if (dataObj[k] !== undefined) return pickNumber(dataObj[k]);
  }
  return 0;
}

exports.getBusinessOwnerDashboardOverview = async (req, res) => {
  try {
    // Get businesses assigned to this owner
    const myBusinesses = await Business.findAll({
      where: { ownerUserId: req.user.id },
      attributes: ["id", "businessName", "category", "city", "isActive", "createdAt"],
      order: [["createdAt", "DESC"]],
    });

    const businessIds = myBusinesses.map((b) => b.id);

    // If no businesses assigned, still return a valid response
    if (businessIds.length === 0) {
      return OK(res, "business_owner_dashboard_overview", {
        businesses: [],
        totals: {
          totalReports: 0,
          reportsByType: {
            DAILY: 0,
            WEEKLY: 0,
            MONTHLY: 0,
            QUARTERLY: 0,
            HALF_YEARLY: 0,
            YEARLY: 0,
          },
          kpis: {
            today: { sales: 0, expenses: 0, profitLoss: 0 },
            thisMonth: { sales: 0, expenses: 0, profitLoss: 0 },
            last30Days: { sales: 0, expenses: 0, profitLoss: 0 },
          },
        },
        recent: { reports: [] },
      });
    }

    // Counts
    const totalReports = await Report.count({
      where: { businessId: { [Op.in]: businessIds } },
    });

    const types = ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"];
    const reportsByType = {};
    for (const t of types) {
      reportsByType[t] = await Report.count({
        where: { businessId: { [Op.in]: businessIds }, reportType: t },
      });
    }

    // KPI ranges
    const now = new Date();

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);

    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    async function sumDaily(rangeWhere) {
      const daily = await Report.findAll({
        where: {
          businessId: { [Op.in]: businessIds },
          reportType: "DAILY",
          ...rangeWhere,
        },
        attributes: ["data"],
      });

      let sales = 0;
      let expenses = 0;

      for (const r of daily) {
        const obj = safeParseData(r.data);
        sales += getSalesValue(obj);
        expenses += getExpenseValue(obj);
      }

      const profitLoss = sales - expenses;
      return { sales, expenses, profitLoss };
    }

    const kpiToday = await sumDaily({ createdAt: { [Op.gte]: startOfToday, [Op.lt]: startOfTomorrow } });
    const kpiThisMonth = await sumDaily({ createdAt: { [Op.gte]: startOfMonth, [Op.lt]: startOfNextMonth } });
    const kpiLast30Days = await sumDaily({ createdAt: { [Op.gte]: last30Days } });

    // Recent reports (latest 5)
    const recentReports = await Report.findAll({
      where: { businessId: { [Op.in]: businessIds } },
      attributes: ["id", "businessId", "reportType", "data", "createdAt"],
      order: [["createdAt", "DESC"]],
      limit: 5,
    });

    return OK(res, "business_owner_dashboard_overview", {
      businesses: myBusinesses,
      totals: {
        totalReports,
        reportsByType,
        kpis: {
          today: kpiToday,
          thisMonth: kpiThisMonth,
          last30Days: kpiLast30Days,
        },
      },
      recent: {
        reports: recentReports,
      },
    });
  } catch (err) {
    console.error("business owner dashboard overview error:", err);
    return FAIL(res, "server error", "SERVER_ERROR", 500);
  }
};