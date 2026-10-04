import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Card, CardContent } from "@/components/ui/card";

import MembersList from "./MembersList";
import AddMember from "./AddMember";

function MemberTabs() {
  return (
    <Tabs defaultValue="members" className="w-full">
      <TabsList className='my-4'>
        <TabsTrigger value="members">Members</TabsTrigger>

        <TabsTrigger value="add-member">Add Member</TabsTrigger>
      </TabsList>

      <Card>
        <CardContent className="">
          <TabsContent value="members" className="">
            <MembersList />
          </TabsContent>

          <TabsContent value="add-member" className="">
            <AddMember />
          </TabsContent>
        </CardContent>
      </Card>
    </Tabs>
  );
}

export default MemberTabs;
