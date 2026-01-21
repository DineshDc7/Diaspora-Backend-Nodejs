const { Op } = require("sequelize");
const { Business, Report } = require("../../models");
const { OK, FAIL } = require("../../utils/response");

function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
}

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

exports.createReport = async (req, res) => {
  try {
    const { businessId, reportType, data, notes } = req.body;

    const id = parseInt(businessId, 10);
    if (!id) {
      return FAIL(res, "Invalid businessId", "VALIDATION_BUSINESS_ID_INVALID", 400);
    }

    const allowedTypes = ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"];
    const finalType = String(reportType || "").toUpperCase();

    if (!allowedTypes.includes(finalType)) {
      return FAIL(res, "Invalid reportType", "VALIDATION_REPORT_TYPE_INVALID", 400);
    }

    // data must be JSON string in multipart/form-data
    const parsedData = data ? safeJsonParse(data) : {};
    if (data && parsedData === null) {
      return FAIL(res, "Invalid data JSON", "VALIDATION_DATA_INVALID", 400);
    }

    // OPTIONAL: verify business exists
    const business = await Business.findByPk(id);
    if (!business) {
      return FAIL(res, "Business not found", "BUSINESS_NOT_FOUND", 404);
    }

    // ✅ ownership check: owner can only create reports for their own businesses
    if (business.ownerUserId !== req.user.id) {
      return FAIL(res, "forbidden", "AUTH_FORBIDDEN", 403);
    }

    const photoFile = req.files?.photo?.[0];
    const videoFile = req.files?.video?.[0];

    const report = await Report.create({
      businessId: id,
      createdByUserId: req.user.id,
      reportType: finalType,
      data: parsedData || {},
      notes: notes ? String(notes) : null,
      photoPath: photoFile ? `uploads/reports/${photoFile.filename}` : null,
      videoPath: videoFile ? `uploads/reports/${videoFile.filename}` : null,
    });

    return OK(
      res,
      "report_created",
      {
        report: {
          id: report.id,
          businessId: report.businessId,
          reportType: report.reportType,
          data: report.data,
          notes: report.notes,
          photoPath: report.photoPath,
          videoPath: report.videoPath,
          createdByUserId: report.createdByUserId,
          createdAt: report.createdAt,
        },
      },
      201
    );
  } catch (err) {
    console.error("createReport error:", err);
    return FAIL(res, "server error", "SERVER_ERROR", 500);
  }
};

exports.getReports = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const offset = (page - 1) * limit;

    const businessIdParam = req.query.businessId;
    const reportTypeParam = req.query.reportType;

    // ✅ owner can only see reports for businesses assigned to them
    const myBusinesses = await Business.findAll({
      where: { ownerUserId: req.user.id },
      attributes: ["id"],
    });
    const businessIds = myBusinesses.map((b) => b.id);

    const where = {
      businessId: businessIds.length ? { [Op.in]: businessIds } : -1,
    };

    if (businessIdParam) {
      const businessId = parseInt(businessIdParam, 10);
      if (!businessId) {
        return FAIL(res, "Invalid businessId", "VALIDATION_BUSINESS_ID_INVALID", 400);
      }

      // ✅ ensure provided businessId belongs to this owner
      if (!businessIds.includes(businessId)) {
        return FAIL(res, "forbidden", "AUTH_FORBIDDEN", 403);
      }

      where.businessId = businessId;
    }

    if (reportTypeParam) {
      const allowedTypes = ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"];
      const finalType = String(reportTypeParam).toUpperCase();
      if (!allowedTypes.includes(finalType)) {
        return FAIL(res, "Invalid reportType", "VALIDATION_REPORT_TYPE_INVALID", 400);
      }
      where.reportType = finalType;
    }

    const { rows, count } = await Report.findAndCountAll({
      where,
      attributes: [
        "id",
        "businessId",
        "reportType",
        "data",
        "notes",
        "photoPath",
        "videoPath",
        "createdByUserId",
        "createdAt",
      ],
      limit,
      offset,
      order: [["createdAt", "DESC"]],
    });

    return OK(res, "reports_list", {
      reports: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
      appliedFilters: {
        businessId: where.businessId || null,
        reportType: where.reportType || null,
      },
    });
  } catch (err) {
    console.error("getReports error:", err);
    return FAIL(res, "server error", "SERVER_ERROR", 500);
  }
};

exports.getReportById = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) {
      return FAIL(res, "Invalid report id", "VALIDATION_ID_INVALID", 400);
    }

    const report = await Report.findOne({
      where: { id },
      attributes: [
        "id",
        "businessId",
        "reportType",
        "data",
        "notes",
        "photoPath",
        "videoPath",
        "createdByUserId",
        "createdAt",
        "updatedAt",
      ],
    });

    if (!report) {
      return FAIL(res, "Report not found", "REPORT_NOT_FOUND", 404);
    }

    const business = await Business.findByPk(report.businessId);
    if (!business || business.ownerUserId !== req.user.id) {
      return FAIL(res, "forbidden", "AUTH_FORBIDDEN", 403);
    }

    return OK(res, "report_details", { report });
  } catch (err) {
    console.error("getReportById error:", err);
    return FAIL(res, "server error", "SERVER_ERROR", 500);
  }
};

exports.getReportsStats = async (req, res) => {
  try {
    // Find businesses assigned to this business owner
    const myBusinesses = await Business.findAll({
      where: { ownerUserId: req.user.id },
      attributes: ["id"],
    });

    const businessIds = myBusinesses.map((b) => b.id);

    if (businessIds.length === 0) {
      return OK(res, "business_owner_reports_stats", {
        totalReports: 0,
        reportsByType: {
          DAILY: 0,
          WEEKLY: 0,
          MONTHLY: 0,
          QUARTERLY: 0,
          HALF_YEARLY: 0,
          YEARLY: 0,
        },
        kpis: { sales: 0, expenses: 0, profitLoss: 0 },
        appliedFilters: { businessId: null, reportType: null, fromDate: null, toDate: null },
      });
    }

    const where = { businessId: { [Op.in]: businessIds } };

    // Optional businessId filter (must belong to this owner)
    const businessIdParam = req.query.businessId;
    if (businessIdParam) {
      const bid = parseInt(businessIdParam, 10);
      if (!bid) return FAIL(res, "Invalid businessId", "VALIDATION_BUSINESS_ID_INVALID", 400);
      if (!businessIds.includes(bid)) return FAIL(res, "forbidden", "AUTH_FORBIDDEN", 403);
      where.businessId = bid;
    }

    // Optional reportType filter
    const reportTypeParam = req.query.reportType;
    if (reportTypeParam) {
      const allowedTypes = ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"];
      const finalType = String(reportTypeParam).toUpperCase();
      if (!allowedTypes.includes(finalType)) {
        return FAIL(res, "Invalid reportType", "VALIDATION_REPORT_TYPE_INVALID", 400);
      }
      where.reportType = finalType;
    }

    // Optional date range filter
    const fromDateParam = req.query.fromDate ? String(req.query.fromDate).trim() : "";
    const toDateParam = req.query.toDate ? String(req.query.toDate).trim() : "";

    if (fromDateParam || toDateParam) {
      const range = {};
      if (fromDateParam) {
        const from = new Date(fromDateParam);
        if (Number.isNaN(from.getTime())) {
          return FAIL(res, "Invalid fromDate", "VALIDATION_FROM_DATE_INVALID", 400);
        }
        range[Op.gte] = from;
      }
      if (toDateParam) {
        const to = new Date(toDateParam);
        if (Number.isNaN(to.getTime())) {
          return FAIL(res, "Invalid toDate", "VALIDATION_TO_DATE_INVALID", 400);
        }
        range[Op.lte] = to;
      }
      where.createdAt = range;
    }

    // Totals
    const totalReports = await Report.count({ where });

    const types = ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"];
    const reportsByType = {};
    for (const t of types) {
      reportsByType[t] = await Report.count({
        where: { ...where, reportType: t },
      });
    }

    // KPI sums — DAILY only (same date/business filters)
    const dailyWhere = { ...where, reportType: "DAILY" };
    const dailyRows = await Report.findAll({
      where: dailyWhere,
      attributes: ["data"],
    });

    let sales = 0;
    let expenses = 0;

    for (const r of dailyRows) {
      const obj = safeParseData(r.data);
      sales += getSalesValue(obj);
      expenses += getExpenseValue(obj);
    }

    const profitLoss = sales - expenses;

    return OK(res, "business_owner_reports_stats", {
      totalReports,
      reportsByType,
      kpis: { sales, expenses, profitLoss },
      appliedFilters: {
        businessId: businessIdParam ? parseInt(businessIdParam, 10) : null,
        reportType: reportTypeParam ? String(reportTypeParam).toUpperCase() : null,
        fromDate: fromDateParam || null,
        toDate: toDateParam || null,
      },
    });
  } catch (err) {
    console.error("getReportsStats error:", err);
    return FAIL(res, "server error", "SERVER_ERROR", 500);
  }
};