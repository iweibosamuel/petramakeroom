import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import { MakeRoom } from "./screens/MakeRoom";
import { GiveLanding } from "./screens/Give/GiveLanding";
import { IndividualGive } from "./screens/Give/IndividualGive";
import { TierHome } from "./screens/Give/TierHome";
import { GroupCreate } from "./screens/Give/GroupCreate";
import { PledgeSchedule } from "./screens/Give/PledgeSchedule";
import { MyPledges, TrackGiving } from "./screens/Give/MyGiving";

const OldPledgeLink = (): JSX.Element => (
  <Navigate to={`/trackgiving/mypledge/${useParams().pledgeId}`} replace />
);

export const App = (): JSX.Element => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MakeRoom />} />
        <Route path="/give" element={<GiveLanding />} />
        <Route path="/give/burden-bearer" element={<TierHome tier="burden_bearer" />} />
        <Route
          path="/give/burden-bearer/individual"
          element={<IndividualGive tier="burden_bearer" />}
        />
        <Route
          path="/give/burden-bearer/group/new"
          element={<GroupCreate tier="burden_bearer" />}
        />
        <Route path="/give/centurion" element={<TierHome tier="centurion" />} />
        <Route
          path="/give/centurion/individual"
          element={<IndividualGive tier="centurion" />}
        />
        <Route
          path="/give/centurion/group/new"
          element={<GroupCreate tier="centurion" />}
        />
        {/* Older links from before the tier pages existed. */}
        <Route
          path="/give/individual"
          element={<Navigate to="/give/burden-bearer/individual" replace />}
        />
        <Route
          path="/give/group/new"
          element={<Navigate to="/give/burden-bearer/group/new" replace />}
        />
        {/* Invite / join / confirm links from the old group flow. */}
        <Route path="/give/group/*" element={<Navigate to="/give" replace />} />
        {/* Giving starts at /give; looking up existing pledges is /trackgiving. */}
        <Route path="/trackgiving" element={<TrackGiving />} />
        <Route path="/trackgiving/mypledge" element={<MyPledges />} />
        <Route path="/trackgiving/mypledge/:pledgeId" element={<PledgeSchedule />} />
        {/* Links in emails sent before pledge pages moved under Track giving. */}
        <Route path="/give/schedule/:pledgeId" element={<OldPledgeLink />} />
        <Route path="/give/my" element={<Navigate to="/trackgiving" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
