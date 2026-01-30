import { Button } from '@/components/ui/button';
import { useAuth } from '@/app/_context/AuthContext';
import { Search, Send, User } from 'lucide-react'
import React from 'react'

function Header() {
    const { user } = useAuth();
  return (
    <div className='flex justify-end w-full gap-2 items-center'>
        <div className='flex gap-2 items-center border rounded-md p-1'>
            <Search className='h-4 w-4 '/>
            <input type='text' placeholder='Search'/>
        </div>
        <div className='w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center'>
            <User className='h-4 w-4 text-white'/>
        </div>
        <Button className='gap-2 flex text-sm
        h-8 hover:bg-blue-700 bg-blue-600
        '> <Send className='h-4 w-4'/> Invite</Button>
    </div>
  )
}

export default Header