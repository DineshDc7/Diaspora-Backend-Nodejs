const { Business } = require("../../models");
const { OK, FAIL } = require("../../utils/response");

exports.getMyBusinesses = async (req, res) => {
  try {
    const businesses = await Business.findAll({
      where: { ownerUserId: req.user.id },
      attributes: [
        "id",
        "businessName",
        "ownerName",
        "ownerPhone",
        "category",
        "city",
        "isActive",
        "ownerUserId",
        "createdAt",
        "updatedAt",
      ],
      order: [["createdAt", "DESC"]],
    });

    return OK(res, "my_businesses", { businesses });
  } catch (err) {
    console.error("getMyBusinesses error:", err);
    return FAIL(res, "server error", "SERVER_ERROR", 500);
  }
};

exports.getMyBusinessById = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) {
      return FAIL(res, "Invalid business id", "VALIDATION_ID_INVALID", 400);
    }

    const business = await Business.findOne({
      where: { id, ownerUserId: req.user.id },
      attributes: [
        "id",
        "businessName",
        "ownerName",
        "ownerPhone",
        "category",
        "city",
        "isActive",
        "ownerUserId",
        "createdAt",
        "updatedAt",
      ],
    });

    if (!business) {
      return FAIL(res, "Business not found", "BUSINESS_NOT_FOUND", 404);
    }

    return OK(res, "my_business_details", { business });
  } catch (err) {
    console.error("getMyBusinessById error:", err);
    return FAIL(res, "server error", "SERVER_ERROR", 500);
  }
};

exports.updateMyBusiness = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) {
      return FAIL(res, "Invalid business id", "VALIDATION_ID_INVALID", 400);
    }

    const business = await Business.findOne({
      where: { id, ownerUserId: req.user.id },
    });

    if (!business) {
      return FAIL(res, "Business not found", "BUSINESS_NOT_FOUND", 404);
    }

    const { businessName, ownerName, ownerPhone, category, city, isActive } = req.body;

    const updates = {};

    if (businessName !== undefined) {
      if (!businessName || typeof businessName !== "string") {
        return FAIL(res, "Invalid business name", "VALIDATION_BUSINESS_NAME_INVALID", 400);
      }
      updates.businessName = businessName.trim();
    }

    if (ownerName !== undefined) {
      if (!ownerName || typeof ownerName !== "string") {
        return FAIL(res, "Invalid owner name", "VALIDATION_OWNER_NAME_INVALID", 400);
      }
      updates.ownerName = ownerName.trim();
    }

    if (ownerPhone !== undefined) {
      if (ownerPhone !== null && typeof ownerPhone !== "string") {
        return FAIL(res, "Invalid owner phone", "VALIDATION_OWNER_PHONE_INVALID", 400);
      }
      updates.ownerPhone = ownerPhone;
    }

    if (category !== undefined) {
      if (!category || typeof category !== "string") {
        return FAIL(res, "Invalid category", "VALIDATION_CATEGORY_INVALID", 400);
      }
      updates.category = category.trim();
    }

    if (city !== undefined) {
      if (!city || typeof city !== "string") {
        return FAIL(res, "Invalid city", "VALIDATION_CITY_INVALID", 400);
      }
      updates.city = city.trim();
    }

    if (isActive !== undefined) {
      updates.isActive = Boolean(isActive);
    }

    if (Object.keys(updates).length === 0) {
      return OK(res, "business_updated", { business });
    }

    await business.update(updates);

    return OK(res, "business_updated", { business });
  } catch (err) {
    console.error("updateMyBusiness error:", err);
    return FAIL(res, "server error", "SERVER_ERROR", 500);
  }
};