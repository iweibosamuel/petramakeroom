import { BrowserRouter, Route, Routes } from "react-router-dom";
import { MakeRoom } from "./screens/MakeRoom";
import { GiveLanding } from "./screens/Give/GiveLanding";
import { IndividualGive } from "./screens/Give/IndividualGive";
import { GroupCreate } from "./screens/Give/GroupCreate";
import { GroupHub } from "./screens/Give/GroupHub";
import { GroupJoin } from "./screens/Give/GroupJoin";
import { GroupConfirm } from "./screens/Give/GroupConfirm";
import { GroupMemberPledge } from "./screens/Give/GroupMemberPledge";
import { PledgeSchedule } from "./screens/Give/PledgeSchedule";
import { MyGiving } from "./screens/Give/MyGiving";

export const App = (): JSX.Element => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MakeRoom />} />
        <Route path="/give" element={<GiveLanding />} />
        <Route path="/give/individual" element={<IndividualGive />} />
        <Route path="/give/group/new" element={<GroupCreate />} />
        <Route path="/give/group/:groupId" element={<GroupHub />} />
        <Route path="/give/group/:groupId/join" element={<GroupJoin />} />
        <Route path="/give/group/confirm/:token" element={<GroupConfirm />} />
        <Route
          path="/give/group/member/:memberId/pledge"
          element={<GroupMemberPledge />}
        />
        <Route path="/give/schedule/:pledgeId" element={<PledgeSchedule />} />
        <Route path="/give/my" element={<MyGiving />} />
      </Routes>
    </BrowserRouter>
  );
};
