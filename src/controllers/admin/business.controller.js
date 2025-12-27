const { Op } = require("sequelize");
const { Business } = require("../../models");
const { OK, FAIL } = require("../../utils/response");

exports.getBusinesses = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const offset = (page - 1) * limit;

    const search = req.query.search ? String(req.query.search).trim() : "";

    const where = {};

    if (search) {
      where[Op.or] = [
        { businessName: { [Op.like]: `%${search}%` } },
        { ownerName: { [Op.like]: `%${search}%` } },
        { ownerPhone: { [Op.like]: `%${search}%` } },
        { category: { [Op.like]: `%${search}%` } },
        { city: { [Op.like]: `%${search}%` } },
      ];
    }

    const { rows, count } = await Business.findAndCountAll({
      where,
      attributes: [
        "id",
        "businessName",
        "ownerName",
        "ownerPhone",
        "category",
        "city",
        "isActive",
        "createdAt",
      ],
      limit,
      offset,
      order: [["createdAt", "DESC"]],
    });

    return OK(res, "businesses_list", {
      businesses: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
      appliedFilters: {
        search: search || null,
      },
    });
  } catch (err) {
    console.error("admin getBusinesses error:", err);
    return FAIL(res, "server error", "SERVER_ERROR", 500);
  }
};

exports.createBusiness = async (req, res) => {
  try {
    const { businessName, ownerName, ownerPhone, category, city } = req.body;

    if (!businessName || typeof businessName !== "string") {
      return FAIL(res, "Business name is required", "VALIDATION_BUSINESS_NAME_REQUIRED", 400);
    }

    if (!ownerName || typeof ownerName !== "string") {
      return FAIL(res, "Owner name is required", "VALIDATION_OWNER_NAME_REQUIRED", 400);
    }

    if (!category || typeof category !== "string") {
      return FAIL(res, "Category is required", "VALIDATION_CATEGORY_REQUIRED", 400);
    }

    if (!city || typeof city !== "string") {
      return FAIL(res, "City is required", "VALIDATION_CITY_REQUIRED", 400);
    }

    const business = await Business.create({
      businessName: businessName.trim(),
      ownerName: ownerName.trim(),
      ownerPhone: ownerPhone ? String(ownerPhone).trim() : null,
      category: category.trim(),
      city: city.trim(),
      isActive: true,
    });

    return OK(
      res,
      "business_created",
      {
        business: {
          id: business.id,
          businessName: business.businessName,
          ownerName: business.ownerName,
          ownerPhone: business.ownerPhone,
          category: business.category,
          city: business.city,
          isActive: business.isActive,
          createdAt: business.createdAt,
        },
      },
      201
    );
  } catch (err) {
    console.error("admin createBusiness error:", err);
    return FAIL(res, "server error", "SERVER_ERROR", 500);
  }
};

exports.getBusinessById = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) {
      return FAIL(res, "Invalid business id", "VALIDATION_ID_INVALID", 400);
    }

    const business = await Business.findByPk(id, {
      attributes: [
        "id",
        "businessName",
        "ownerName",
        "ownerPhone",
        "category",
        "city",
        "isActive",
        "createdAt",
        "updatedAt",
      ],
    });

    if (!business) {
      return FAIL(res, "Business not found", "BUSINESS_NOT_FOUND", 404);
    }

    return OK(res, "business_details", { business });
  } catch (err) {
    console.error("admin getBusinessById error:", err);
    return FAIL(res, "server error", "SERVER_ERROR", 500);
  }
};

exports.updateBusiness = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) {
      return FAIL(res, "Invalid business id", "VALIDATION_ID_INVALID", 400);
    }

    const { businessName, ownerName, ownerPhone, category, city, isActive } = req.body;

    const business = await Business.findByPk(id);
    if (!business) {
      return FAIL(res, "Business not found", "BUSINESS_NOT_FOUND", 404);
    }

    if (businessName !== undefined) {
      if (!businessName || typeof businessName !== "string") {
        return FAIL(res, "Business name is invalid", "VALIDATION_BUSINESS_NAME_INVALID", 400);
      }
      business.businessName = businessName.trim();
    }

    if (ownerName !== undefined) {
      if (!ownerName || typeof ownerName !== "string") {
        return FAIL(res, "Owner name is invalid", "VALIDATION_OWNER_NAME_INVALID", 400);
      }
      business.ownerName = ownerName.trim();
    }

    if (ownerPhone !== undefined) {
      business.ownerPhone = ownerPhone ? String(ownerPhone).trim() : null;
    }

    if (category !== undefined) {
      if (!category || typeof category !== "string") {
        return FAIL(res, "Category is invalid", "VALIDATION_CATEGORY_INVALID", 400);
      }
      business.category = category.trim();
    }

    if (city !== undefined) {
      if (!city || typeof city !== "string") {
        return FAIL(res, "City is invalid", "VALIDATION_CITY_INVALID", 400);
      }
      business.city = city.trim();
    }

    if (isActive !== undefined) {
      business.isActive = Boolean(isActive);
    }

    await business.save();

    return OK(res, "business_updated", {
      business: {
        id: business.id,
        businessName: business.businessName,
        ownerName: business.ownerName,
        ownerPhone: business.ownerPhone,
        category: business.category,
        city: business.city,
        isActive: business.isActive,
        updatedAt: business.updatedAt,
      },
    });
  } catch (err) {
    console.error("admin updateBusiness error:", err);
    return FAIL(res, "server error", "SERVER_ERROR", 500);
  }
};

exports.getBusinessOptions = async (req, res) => {
  try {
    const businesses = await Business.findAll({
      attributes: ["id", "businessName"],
      order: [["businessName", "ASC"]],
    });

    return OK(res, "business_options", { businesses });
  } catch (err) {
    console.error("admin getBusinessOptions error:", err);
    return FAIL(res, "server error", "SERVER_ERROR", 500);
  }
};