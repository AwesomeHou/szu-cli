export function buildLectureListPayload(response, options = {}) {
  const rows = Array.isArray(response?.data) ? response.data : [];
  const normalized = rows.map((row) => normalizeLecture(
    row,
    options.classroomsByLecture?.[String(row.id)],
    options.now
  ));
  const availability = options.availability ?? 'available';
  const filtered = normalized.filter((item) => {
    if (availability === 'all') {
      return true;
    }
    if (availability === 'open') {
      return item.registrationOpen;
    }
    return item.availabilityState === 'available';
  });

  return {
    total: filtered.length,
    summary: {
      openCount: normalized.filter((item) => item.registrationOpen).length,
      availableCount: normalized.filter((item) => item.availabilityState === 'available').length,
      fullCount: normalized.filter((item) => item.availabilityState === 'full').length,
      unknownCount: normalized.filter((item) => item.availabilityState === 'unknown').length,
      closedCount: normalized.filter((item) => item.availabilityState === 'closed').length
    },
    items: filtered.slice(0, options.limit ?? 10),
    sourceUrl: options.sourceUrl
  };
}

export function buildLectureItemPayload(row, classroomRows, options = {}) {
  return {
    ...normalizeLecture(row, classroomRows, options.now),
    classrooms: Array.isArray(classroomRows) ? classroomRows.map(normalizeClassroom) : [],
    sourceUrl: options.sourceUrl
  };
}

export function buildLectureProgressPayload(user, options = {}) {
  const offline = progressPart(user?.offlineTimes, user?.sumOfflineTimes);
  const online = progressPart(user?.onlineTimes, user?.sumOnlineTimes);
  const completed = offline.completed + online.completed;
  const required = offline.required + online.required;

  return {
    offline,
    online,
    percentage: required === 0 ? 100 : Math.min(100, Math.floor(100 * completed / required)),
    sourceUrl: options.sourceUrl
  };
}

function normalizeLecture(row, classroomRows, nowValue) {
  const registrationOpen = isRegistrationOpen(row, nowValue);
  const hasClassrooms = Array.isArray(classroomRows) && classroomRows.length > 0;
  const availableRooms = hasClassrooms
    ? classroomRows.filter((room) => nonNegativeInteger(room.remainSeats) > 0).length
    : 0;
  const totalRemainingSeats = hasClassrooms
    ? classroomRows.reduce((total, room) => total + nonNegativeInteger(room.remainSeats), 0)
    : 0;
  const availabilityState = !registrationOpen
    ? 'closed'
    : !hasClassrooms
      ? 'unknown'
      : totalRemainingSeats > 0
        ? 'available'
        : 'full';

  return {
    id: stringOrNull(row.id),
    title: stringOrNull(row.name),
    type: stringOrNull(row.lectureType),
    teacher: stringOrNull(row.teacherName),
    department: stringOrNull(row.deptName),
    sponsor: stringOrNull(row.nameOfSponsor),
    registrationStart: stringOrNull(row.startRegistration),
    registrationDeadline: stringOrNull(row.deadlineRegistration),
    lectureStart: stringOrNull(row.lectureStartTime),
    lectureEnd: stringOrNull(row.lectureEndTime),
    status: stringOrNull(row.status),
    registrationOpen,
    registerable: availabilityState === 'available',
    availabilityState,
    availableRooms,
    totalRemainingSeats,
    introduction: htmlTextOrNull(row.introduceOfLecture),
    teacherIntroduction: htmlTextOrNull(row.introduceOfTeacher)
  };
}

function normalizeClassroom(row) {
  return {
    campus: stringOrNull(row.campus),
    building: stringOrNull(row.building),
    roomNumber: stringOrNull(row.roomNumber),
    isSpeaker: booleanValue(row.isSpeaker),
    capacity: nonNegativeInteger(row.seatNum),
    reservedSeats: nonNegativeInteger(row.reservedSeats),
    remainingSeats: nonNegativeInteger(row.remainSeats),
    status: stringOrNull(row.chooseStatus ?? row.status)
  };
}

function isRegistrationOpen(row, nowValue) {
  if (row?.status !== '正在报名中') {
    return false;
  }
  const now = nowValue instanceof Date ? nowValue.getTime() : Date.now();
  const start = parseLocalDate(row.startRegistration);
  const end = parseLocalDate(row.deadlineRegistration);
  return start !== null && end !== null && start <= now && now <= end;
}

function booleanValue(value) {
  return value === true || value === 1 || value === '1' || value === '是';
}

function progressPart(completedValue, requiredValue) {
  const completed = nonNegativeInteger(completedValue);
  const required = nonNegativeInteger(requiredValue);
  return {
    completed,
    required,
    remaining: Math.max(required - completed, 0),
    passed: completed >= required
  };
}

function nonNegativeInteger(value) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function parseLocalDate(value) {
  const match = String(value ?? '').match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/
  );
  if (!match) {
    return null;
  }
  const [, year, month, day, hour, minute, second = '0'] = match;
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  );
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

function stringOrNull(value) {
  return value === null || value === undefined || value === '' ? null : String(value);
}

function htmlTextOrNull(value) {
  const text = stringOrNull(value);
  if (text === null) {
    return null;
  }
  return text
    .replace(/<(?:script|style)\b[^>]*>[\s\S]*?<\/(?:script|style)>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;|&#160;/gi, '')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
