const { Business, Report } = require("../../models");
const { OK, FAIL } = require("../../utils/response");

function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
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

    const where = {
      createdByUserId: req.user.id, // ✅ Business owner sees only their own reports
    };

    if (businessIdParam) {
      const businessId = parseInt(businessIdParam, 10);
      if (!businessId) {
        return FAIL(res, "Invalid businessId", "VALIDATION_BUSINESS_ID_INVALID", 400);
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
      where: {
        id,
        createdByUserId: req.user.id, // ✅ owner can only see their own reports
      },
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

    return OK(res, "report_details", { report });
  } catch (err) {
    console.error("getReportById error:", err);
    return FAIL(res, "server error", "SERVER_ERROR", 500);
  }
};