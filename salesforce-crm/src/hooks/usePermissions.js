
import { useCallback, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { PERMISSIONS } from "../config/permissions";

export function usePermissions() {
  const { user } = useAuth();

  const permissions = useMemo(
    () => PERMISSIONS[user?.role] || {},
    [user?.role]
  );

  const can = useCallback((object, action) => {
    return permissions[object]?.[action] === true;
  }, [permissions]);

  const canView = useCallback(
    object => can(object, "read"),
    [can]
  );

  const canCreate = useCallback(
    object => can(object, "create"),
    [can]
  );

  const canUpdate = useCallback(
    object => can(object, "update"),
    [can]
  );

  const canDelete = useCallback(
    object => can(object, "delete"),
    [can]
  );

  return { can, canView, canCreate, canUpdate, canDelete };
}
