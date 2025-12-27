const { Op } = require("sequelize");
const { Report, Business, User, sequelize } = require("../../models");
const { OK, FAIL } = require("../../utils/response");

exports.getReports = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const offset = (page - 1) * limit;

    const businessIdParam = req.query.businessId;
    const reportTypeParam = req.query.reportType;
    const search = req.query.search ? String(req.query.search).trim() : "";

    const fromDateParam = req.query.fromDate ? String(req.query.fromDate).trim() : "";
    const toDateParam = req.query.toDate ? String(req.query.toDate).trim() : "";

    const where = {};

    // businessId filter
    if (businessIdParam) {
      const businessId = parseInt(businessIdParam, 10);
      if (!businessId) {
        return FAIL(res, "Invalid businessId", "VALIDATION_BUSINESS_ID_INVALID", 400);
      }
      where.businessId = businessId;
    }

    // reportType filter
    if (reportTypeParam) {
      const allowedTypes = ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"];
      const finalType = String(reportTypeParam).toUpperCase();
      if (!allowedTypes.includes(finalType)) {
        return FAIL(res, "Invalid reportType", "VALIDATION_REPORT_TYPE_INVALID", 400);
      }
      where.reportType = finalType;
    }

    // date range filter (createdAt)
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

    // include (for admin table + search)
    const include = [
      {
        model: Business,
        as: "business",
        attributes: ["id", "businessName", "ownerName", "ownerPhone", "city", "category"],
      },
      {
        model: User,
        as: "createdBy",
        attributes: ["id", "name", "email", "mobile", "role"],
      },
    ];

    // search across report + business + createdBy
    if (search) {
      where[Op.and] = where[Op.and] || [];
      where[Op.and].push({
        [Op.or]: [
          { notes: { [Op.like]: `%${search}%` } },

          // Business fields
          sequelize.where(sequelize.col("business.businessName"), { [Op.like]: `%${search}%` }),
          sequelize.where(sequelize.col("business.ownerName"), { [Op.like]: `%${search}%` }),
          sequelize.where(sequelize.col("business.ownerPhone"), { [Op.like]: `%${search}%` }),
          sequelize.where(sequelize.col("business.city"), { [Op.like]: `%${search}%` }),
          sequelize.where(sequelize.col("business.category"), { [Op.like]: `%${search}%` }),

          // Creator fields
          sequelize.where(sequelize.col("createdBy.name"), { [Op.like]: `%${search}%` }),
          sequelize.where(sequelize.col("createdBy.email"), { [Op.like]: `%${search}%` }),
          sequelize.where(sequelize.col("createdBy.mobile"), { [Op.like]: `%${search}%` }),
        ],
      });
    }

    const { rows, count } = await Report.findAndCountAll({
      where,
      attributes: [
        "id",
        "businessId",
        "createdByUserId",
        "reportType",
        "data",
        "notes",
        "photoPath",
        "videoPath",
        "createdAt",
      ],
      include,
      distinct: true, // IMPORTANT when using include + count
      limit,
      offset,
      order: [["createdAt", "DESC"]],
    });

    return OK(res, "admin_reports_list", {
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
        search: search || null,
        fromDate: fromDateParam || null,
        toDate: toDateParam || null,
      },
    });
  } catch (err) {
    console.error("admin getReports error:", err);
    return FAIL(res, "server error", "SERVER_ERROR", 500);
  }
};

exports.getReportById = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) {
      return FAIL(res, "Invalid report id", "VALIDATION_ID_INVALID", 400);
    }

    const report = await Report.findByPk(id, {
      attributes: [
        "id",
        "businessId",
        "createdByUserId",
        "reportType",
        "data",
        "notes",
        "photoPath",
        "videoPath",
        "createdAt",
        "updatedAt",
      ],
      include: [
        {
          model: Business,
          as: "business",
          attributes: ["id", "businessName", "city", "category"],
        },
        {
          model: User,
          as: "createdBy",
          attributes: ["id", "name", "email", "mobile", "role"],
        },
      ],
    });

    if (!report) {
      return FAIL(res, "Report not found", "REPORT_NOT_FOUND", 404);
    }

    return OK(res, "admin_report_details", { report });
  } catch (err) {
    console.error("admin getReportById error:", err);
    return FAIL(res, "server error", "SERVER_ERROR", 500);
  }
};