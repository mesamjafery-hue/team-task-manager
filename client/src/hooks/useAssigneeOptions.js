import { useEffect, useState } from 'react';
import { teamsApi } from '../services/api';

/**
 * Options for the "Assignee" filter.
 * - With a team selected: that team's members.
 * - Without one: everyone who shares at least one team with the current user.
 */
export default function useAssigneeOptions(teamId) {
  const [members, setMembers] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const request = teamId ? teamsApi.listMembers(teamId) : teamsApi.listCollaborators();
    request
      .then((res) => {
        if (!cancelled && res.data?.success) {
          setMembers(res.data.members || []);
        }
      })
      .catch((err) => {
        console.error('Failed to load assignee options:', err);
        if (!cancelled) setMembers([]);
      });

    return () => {
      cancelled = true;
    };
  }, [teamId]);

  return members;
}
