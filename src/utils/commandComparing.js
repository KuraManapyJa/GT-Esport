module.exports = (existing, local) => {
  const changed = (a, b) => JSON.stringify(a) !== JSON.stringify(b);

  if (
    changed(existing.name, local.data.name) ||
    changed(
      existing.description || undefined,
      local.data.description || undefined
    ) ||
    // Comparaison spéciale pour les permissions par défaut afin d'éviter les BigInt
    permChanged(existing.defaultMemberPermissions?.bitfield, local.data.default_member_permissions)
  ) {
    return true;
  }

  const optionsChanged = changed(
    optionsArray(existing),
    optionsArray(local.data)
  );

  return optionsChanged;

  // Normalise et compare les permissions sans sérialiser de BigInt directement
  function permChanged(existingPerm, localPerm) {
    // Si les deux sont undefined / null, rien n'a changé
    if (existingPerm == null && localPerm == null) return false;

    const normalize = (value) => {
      if (value == null) return null;
      // BigInt, number, string -> string
      return value.toString();
    };

    return normalize(existingPerm) !== normalize(localPerm);
  }

  function optionsArray(cmd) {
    const cleanObject = (obj) => {
      for (const key in obj) {
        if (typeof obj[key] === "object") {
          cleanObject(obj[key]);
          if (!obj[key] || (Array.isArray(obj[key]) && !obj[key].length)) {
            delete obj[key];
          }
        } else if (obj[key] === undefined) {
          delete obj[key];
        }
      }
    };

    const normalizeObject = (input) => {
      if (Array.isArray(input)) {
        return input.map((item) => normalizeObject(item));
      }

      const normalizedItem = {
        type: input.type,
        name: input.name,
        description: input.description,
        options: input.options ? normalizeObject(input.options) : undefined,
        required: input.required,
      };

      return normalizedItem;
    };

    return (cmd.options || []).map((option) => {
      let cleanedOption = JSON.parse(JSON.stringify(option));
      cleanedOption.options
        ? (cleanedOption.options = normalizeObject(cleanedOption.options))
        : (cleanedOption = normalizeObject(cleanedOption));
      cleanObject(cleanedOption);
      return {
        ...cleanedOption,
        choices: cleanedOption.choices
          ? stringifyChoices(cleanedOption.choices)
          : null,
      };
    });
  }

  function stringifyChoices(choices) {
    return JSON.stringify(choices.map((c) => c.value));
  }
};
