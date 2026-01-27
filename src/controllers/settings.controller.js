const prisma = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');

const DEFAULT_CONSENT_FORM = {
  paragraphs: [
    "I confirm that I am the parent/legal guardian of the child(ren) being photographed and have the authority to consent on their behalf. Portrait Place Studios operates under UK GDPR regulations to ensure the safety, dignity, and privacy of all individuals. All photographs remain the property of Portrait Place Studios until full payment is received. Photographs will only be released to the mother or father of the child(ren). No release will be made to any other individual (relatives, friends, associates) even with written authorization, identification, or video call verification, to protect against data misuse.",
    "I grant consent for Portrait Place Studios to use photographs (including myself and my child(ren)) for marketing, advertising, social media, website galleries, printed materials, and other promotional activities without further notice. Portrait Place Studios is not responsible for any injury, accident, or loss that may occur during the photoshoot. I remain responsible for supervising my child(ren) at all times. Portrait Place Studios accepts no liability for lost or damaged personal belongings.",
    "If I do not collect my photographs on the advised date, they will be shredded or permanently destroyed without further notice. As a mobile studio, uncollected photographs cannot be transported back to a base or future locations. I accept full responsibility for collection and waive all claims against Portrait Place Studios for destruction due to non-collection.",
    "I have read, understood, and agree to all terms of the consent, privacy, collection, and release policy. I accept full responsibility for ensuring only myself or the other parent collects the photographs. I acknowledge that failure to comply may result in refusal to release photographs.",
  ],
  permissionText:
    "I confirmed and allow that the studio may use my photos if required.",
};

const getConsentFormSettings = async (req, res) => {
  try {
    const setting = await prisma.appSetting.findUnique({
      where: { key: 'consent_form' },
    });

    const value = setting?.value || DEFAULT_CONSENT_FORM;
    return successResponse(res, { consentForm: value }, 'Consent form loaded');
  } catch (error) {
    console.error('Get consent form settings error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
};

const updateConsentFormSettings = async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'ADMIN') {
      return errorResponse(res, 'You do not have permission to update settings', 403);
    }

    const { paragraphs, permissionText } = req.body || {};

    if (!Array.isArray(paragraphs) || paragraphs.length === 0) {
      return errorResponse(res, 'Paragraphs are required', 400);
    }

    const cleanedParagraphs = paragraphs
      .map((p) => (typeof p === 'string' ? p.trim() : ''))
      .filter((p) => p.length > 0);

    if (cleanedParagraphs.length === 0) {
      return errorResponse(res, 'Paragraphs are required', 400);
    }

    if (!permissionText || typeof permissionText !== 'string') {
      return errorResponse(res, 'Permission text is required', 400);
    }

    const payload = {
      paragraphs: cleanedParagraphs,
      permissionText: permissionText.trim(),
    };

    const updated = await prisma.appSetting.upsert({
      where: { key: 'consent_form' },
      create: { key: 'consent_form', value: payload },
      update: { value: payload },
    });

    return successResponse(res, { consentForm: updated.value }, 'Consent form saved');
  } catch (error) {
    console.error('Update consent form settings error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
};

module.exports = {
  getConsentFormSettings,
  updateConsentFormSettings,
};

