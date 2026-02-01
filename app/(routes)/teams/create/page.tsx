"use client"
export const dynamic = 'force-dynamic';

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/convex/_generated/api'
import { useAuth } from '@/app/_context/AuthContext'
import { useMutation } from 'convex/react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'
import { toast } from 'sonner'

function CreateTeam() {

  const [teamName,setTeamName]=useState('');
  const createTeam=useMutation(api.teams.createTeam);
  const { user } = useAuth();
  const router=useRouter();
  const createNewTeam=()=>{
    console.log('createNewTeam called, user:', user);
    if (!user?.email) {
      console.log('No user email, returning early');
      return;
    }
    console.log('Creating team with email:', user.email);
    createTeam({
      teamName:teamName,
      createdBy:user.email
    }).then(resp=>{
      console.log('Team create response:', resp);
      if(resp)
      {
          router.push('/dashboard')
          toast('Team created successfully!!!')
      }
    }).catch(err => {
      console.error('Team create error:', err);
    })
  }
  return (
    <div className=' px-6 md:px-16 my-16'>
      <Image src='/logo-black.png'
      alt='logo'
      width={200}
      height={200}/>
      <div className='flex flex-col items-center mt-8'>
        <h2 className='font-bold text-[40px] py-3'>What should we call your team?</h2>
        <h2 className='text-gray-500'>You can always change this later from settings.</h2>
        <div className='mt-7 w-[40%]'>
          <label className='text-gray-500'>Team Name</label>
          <Input placeholder='Team Name'
           className='mt-3'
           onChange={(e)=>setTeamName(e.target.value)}
           />
        </div>
        <Button className='bg-blue-500 mt-9 w-[30%] hover:bg-blue-600'
        disabled={!(teamName&&teamName?.length>0)}
        onClick={()=>createNewTeam()}
        >Create Team</Button>
      </div>
    </div>
  )
}

export default CreateTeam