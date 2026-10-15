import { useState } from "react";
import { Search } from "lucide-react";

import Field from "@/components/additonal/Field";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

import { formatTime, getInitials } from "./attendanceHelpers";

const RECENT_LIMIT = 6;

// Left column: type a member ID, plus who has checked in so far.
//
//   onLookup(memberId)   called with the trimmed, digits-only ID
//   checkIns             [{ id, name, member_Id, avatar_url, checked_in_at }], newest first
//   inputRef             lets the page put the cursor back after a check-in
function CheckInPanel({ onLookup, isLoading, checkIns, inputRef }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();

    const memberId = value.trim();

    if (!memberId) {
      setError("Enter a member ID.");
      return;
    }

    if (!/^\d+$/.test(memberId)) {
      setError("Member ID can only contain numbers.");
      return;
    }

    setError("");
    onLookup(memberId);
  };

  const recent = checkIns.slice(0, RECENT_LIMIT);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Member check-in</h2>
        </CardTitle>
        <CardDescription>
          Type the member ID to bring up their details.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Field label="Member ID" htmlFor="attendance-member-id" error={error}>
            <Input
              ref={inputRef}
              id="attendance-member-id"
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              placeholder="e.g. 1024"
              value={value}
              aria-invalid={Boolean(error)}
              aria-describedby="attendance-member-id-hint"
              onFocus={(event) => event.target.select()}
              onChange={(event) => {
                setValue(event.target.value);
                if (error) setError("");
              }}
              className="h-10 text-base tabular-nums"
            />
          </Field>

          <p
            id="attendance-member-id-hint"
            className="text-xs text-muted-foreground"
          >
            Press Enter to search. Only members of this branch are found.
          </p>

          <Button type="submit" size="lg" disabled={isLoading}>
            <Search aria-hidden="true" />
            {isLoading ? "Looking up..." : "Sumbit"}
          </Button>
        </form>

        <Separator />

        <section aria-labelledby="attendance-recent-heading">
          <div className="mb-3 flex items-center justify-between">
            <h3
              id="attendance-recent-heading"
              className="text-sm font-medium"
            >
              Checked in this session
            </h3>
            <Badge variant="secondary">{checkIns.length}</Badge>
          </div>

          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No one has checked in yet.
            </p>
          ) : (
            <ol className="flex flex-col gap-3">
              {recent.map((entry) => (
                <li key={entry.id} className="flex items-center gap-3">
                  <Avatar size="sm">
                    <AvatarImage
                      src={entry.avatar_url ?? undefined}
                      alt=""
                    />
                    <AvatarFallback>{getInitials(entry.name)}</AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{entry.name}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      ID {entry.member_Id}
                    </p>
                  </div>

                  <time
                    dateTime={entry.checked_in_at}
                    className="text-xs text-muted-foreground tabular-nums"
                  >
                    {formatTime(entry.checked_in_at)}
                  </time>
                </li>
              ))}
            </ol>
          )}
        </section>
      </CardContent>
    </Card>
  );
}

export default CheckInPanel;
