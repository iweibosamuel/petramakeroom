import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { MakeRoom } from "./screens/MakeRoom";
import { GiveLanding } from "./screens/Give/GiveLanding";
import { IndividualGive } from "./screens/Give/IndividualGive";
import { TierHome } from "./screens/Give/TierHome";
import { GroupCreate } from "./screens/Give/GroupCreate";
import { PledgeSchedule } from "./screens/Give/PledgeSchedule";
import { MyGiving } from "./screens/Give/MyGiving";

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
        <Route path="/give/schedule/:pledgeId" element={<PledgeSchedule />} />
        <Route path="/give/my" element={<MyGiving />} />
      </Routes>
    </BrowserRouter>
  );
};
